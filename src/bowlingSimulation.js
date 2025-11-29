import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Ammo from "ammojs-typed";
import * as TWEEN from "@tweenjs/tween.js";

let cam, controls, scene, renderer;
const clock = new THREE.Clock();
const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let scoreboardEl;
let physicsWorld;
let collisionConfiguration, dispatcher, broadphase, solver;
const rigidBodies = [];
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
let transformAux1;
let pinModel = null;
let pinTemplate = null;
let pinShape = null;
let pinBaseY;
let pinHalfH = 0;
let pinRad = 0;
const lanes = [];
const balls = [];
const numLanes = 6;
const laneSpacing = 8;
const playerLane = 1;
const laneLen = 35;
const laneW = 4.5;
const pinPath =
  "https://raw.githubusercontent.com/IanSamuelTrujilloGil/IGS11-Simulador-bolera/main/assets/Bowling.glb";

const ballMat = new THREE.MeshPhongMaterial({ color: 0x202020 });
const pinPositions = [
  { count: 1, z: -24 },
  { count: 2, z: -25 },
  { count: 3, z: -26 },
  { count: 4, z: -27 },
];

Ammo(Ammo).then(init);

function init() {
  setupInput();
  loadPinModel();
  setupScene();
  setupPhysics();
  animate();
}

function setupInput() {
  window.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
      event.preventDefault();
      shootBall();
    }
  });
}

function loadPinModel() {
  const loader = new GLTFLoader();

  loader.load(
    pinPath,
    (gltf) => {
      pinModel = gltf.scene;

      pinModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          const mat = child.material;
          if (mat) {
            if (mat.map) mat.map.encoding = THREE.sRGBEncoding;
            if ("metalness" in mat) mat.metalness = 0.0;
            if ("roughness" in mat) mat.roughness = 0.25;
          }
        }
      });

      pinTemplate = pinModel;
      pinTemplate.scale.set(0.3, 0.3, 0.3);
      pinTemplate.updateMatrixWorld(true);

      const bbox = new THREE.Box3().setFromObject(pinTemplate);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bbox.getSize(size);
      bbox.getCenter(center);

      pinTemplate.position.sub(center);
      pinTemplate.updateMatrixWorld(true);

      const r = Math.max(size.x, size.z) * 0.5;
      pinHalfH = size.y * 0.5;
      pinRad = r;

      pinShape = new Ammo.btCylinderShape(new Ammo.btVector3(r, pinHalfH, r));
      pinShape.setMargin(0.005);

      pinBaseY = 0.05 - 0.444 + pinHalfH;

      createWorld();
    },
    undefined,
    (err) => {
      console.log("error cargando modelo");
    }
  );
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe8f5);

  cam = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );

  cam.position.set(0, 40, 90);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.physicallyCorrectLights = true;

  document.body.appendChild(renderer.domElement);

  const playerX = (playerLane - (numLanes - 1) / 2) * laneSpacing;
  controls = new OrbitControls(cam, renderer.domElement);
  controls.target.set(playerX, 2, -10);
  controls.update();

  const ambLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambLight);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb0b0b0, 0.6);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(-10, 18, 5);
  dirLight.castShadow = true;
  const d = 40;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 2;
  dirLight.shadow.camera.far = 150;
  dirLight.shadow.mapSize.x = 1024;
  dirLight.shadow.mapSize.y = 1024;
  scene.add(dirLight);

  scoreboardEl = document.createElement("div");
  scoreboardEl.id = "scoreboard";
  document.body.appendChild(scoreboardEl);

  const authorEl = document.createElement("div");
  authorEl.id = "authorLabel";
  authorEl.textContent = "Autor: Ian Samuel Trujillo Gil";
  document.body.appendChild(authorEl);

  window.addEventListener("resize", onResize);

  introAnim();
}

function introAnim() {
  const from = { x: 0, y: 40, z: 90 };
  const playerX = (playerLane - (numLanes - 1) / 2) * laneSpacing;
  const to = { x: playerX - 2, y: 4, z: 30 };

  cam.position.set(from.x, from.y, from.z);
  controls.update();

  new TWEEN.Tween(from)
    .to(to, 3000)
    .onUpdate((coords) => {
      cam.position.set(coords.x, coords.y, coords.z);
      controls.update();
    })
    .easing(TWEEN.Easing.Exponential.InOut)
    .delay(200)
    .start();
}

function setupPhysics() {
  collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();

  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -7.8, 0));

  transformAux1 = new Ammo.btTransform();
}

function createWorld() {
  pos.set(0, -0.5, -10);
  quat.set(0, 0, 0, 1);
  const ground = makeBox(
    100,
    1,
    120,
    0,
    pos,
    quat,
    new THREE.MeshPhongMaterial({ color: 0x3b3f4a })
  );
  ground.receiveShadow = true;

  makeLanes();
}

function makeLanes() {
  for (let i = 0; i < numLanes; i++) {
    const lx = (i - (numLanes - 1) / 2) * laneSpacing;

    const lane = {
      index: i,
      laneX: lx,
      pins: [],
      score: 0,
      labelEl: makeLaneLabel(i),
      resetScheduled: false,
      resetTime: 0,
      fallen: 0,
      isAuto: i !== playerLane,
      nextShot: 0,
      strikeShown: false,
    };
    lanes.push(lane);

    pos.set(lx, 0, -10);
    quat.set(0, 0, 0, 1);
    const floor = makeBox(
      laneW,
      0.1,
      laneLen,
      0,
      pos,
      quat,
      new THREE.MeshPhongMaterial({ color: 0xd4b27f })
    );
    floor.receiveShadow = true;

    const wallH = 1;
    const wallT = 0.12;
    const wallOff = laneW * 0.5 + wallT * 0.5;

    pos.set(lx - wallOff, wallH * 0.5, -10);
    makeBox(
      wallT,
      wallH,
      laneLen,
      0,
      pos,
      quat,
      new THREE.MeshPhongMaterial({ color: 0x333333 })
    );

    pos.set(lx + wallOff, wallH * 0.5, -10);
    makeBox(
      wallT,
      wallH,
      laneLen,
      0,
      pos,
      quat,
      new THREE.MeshPhongMaterial({ color: 0x333333 })
    );

    setupPins(lane);
  }
}

function makeLaneLabel(idx) {
  const el = document.createElement("div");
  el.textContent = `Carril ${idx + 1}: 0`;
  el.style.whiteSpace = "nowrap";
  el.style.transformOrigin = "left center";
  scoreboardEl.appendChild(el);
  scoreboardEl.appendChild(document.createElement("br"));
  return el;
}

function updateLabel(lane) {
  lane.labelEl.textContent = `Carril ${lane.index + 1}: ${lane.score}`;
}

function setupPins(lane) {
  const spacing = 0.7;

  pinPositions.forEach((row) => {
    const w = (row.count - 1) * spacing;
    for (let i = 0; i < row.count; i++) {
      const xOff = -w / 2 + i * spacing;
      const px = lane.laneX + xOff;
      const pz = row.z;

      makePin(px, pz, lane.index);
    }
  });
}

function makePin(x, z, laneIdx) {
  const pin = pinTemplate.clone(true);

  pin.position.set(x, pinBaseY, z);
  pin.quaternion.set(0, 0, 0, 1);

  const m = 1;

  let shape;
  const offset = 0.6;
  const comp = new Ammo.btCompoundShape();
  const localT = new Ammo.btTransform();
  localT.setIdentity();
  localT.setOrigin(new Ammo.btVector3(0, offset, 0));
  comp.addChildShape(localT, pinShape);
  shape = comp;

  const body = makeRigidBody(pin, shape, m, pin.position, pin.quaternion);

  body.setRestitution(0.05);
  body.setFriction(0.5);
  body.setDamping(0.05, 0.25);

  const lx = lanes[laneIdx].laneX;

  pin.userData.isPin = true;
  pin.userData.laneIndex = laneIdx;
  pin.userData.fallen = false;

  pin.userData.offsetX = x - lx;
  pin.userData.initY = pin.position.y;
  pin.userData.initZ = z;
  pin.userData.initQ = pin.quaternion.clone();

  lanes[laneIdx].pins.push(pin);
}

function shootBall() {
  mouseCoords.set(0, 0);
  raycaster.setFromCamera(mouseCoords, cam);

  const bMass = 35;
  const bRad = 0.4;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(bRad, 14, 10), ballMat);
  ball.castShadow = true;
  ball.receiveShadow = true;

  const bShape = new Ammo.btSphereShape(bRad);
  bShape.setMargin(0.005);

  pos.copy(raycaster.ray.direction);
  pos.add(raycaster.ray.origin);
  quat.set(0, 0, 0, 1);

  const bBody = makeRigidBody(ball, bShape, bMass, pos, quat, null, null, true);

  pos.copy(raycaster.ray.direction);
  pos.multiplyScalar(24);
  bBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));

  bBody.setRestitution(0.2);
  bBody.setFriction(0.3);
  bBody.setDamping(0.01, 0.05);

  let lIdx = 0;
  let minD = Infinity;
  for (let i = 0; i < lanes.length; i++) {
    const dist = Math.abs(ball.position.x - lanes[i].laneX);
    if (dist < minD) {
      minD = dist;
      lIdx = i;
    }
  }

  ball.userData.isBall = true;
  ball.userData.laneIndex = lIdx;

  balls.push({
    mesh: ball,
    body: bBody,
    laneIndex: lIdx,
    spawnTime: clock.getElapsedTime(),
  });
}

function makeBox(sx, sy, sz, mass, p, q, mat) {
  const obj = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), mat);

  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5)
  );
  shape.setMargin(0.005);

  makeRigidBody(obj, shape, mass, p, q);
  return obj;
}

function makeRigidBody(obj, shape, mass, p, q, vel, angVel, noSleep) {
  if (p) obj.position.copy(p);
  else p = obj.position;

  if (q) obj.quaternion.copy(q);
  else q = obj.quaternion;

  const t = new Ammo.btTransform();
  t.setIdentity();
  t.setOrigin(new Ammo.btVector3(p.x, p.y, p.z));
  t.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));
  const ms = new Ammo.btDefaultMotionState(t);

  const inertia = new Ammo.btVector3(0, 0, 0);
  shape.calculateLocalInertia(mass, inertia);

  const info = new Ammo.btRigidBodyConstructionInfo(mass, ms, shape, inertia);
  const body = new Ammo.btRigidBody(info);

  body.setFriction(0.5);

  if (vel) {
    body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
  }
  if (angVel) {
    body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
  }

  obj.userData.physicsBody = body;
  obj.userData.collided = false;

  scene.add(obj);

  if (mass > 0) {
    rigidBodies.push(obj);
    if (noSleep) {
      body.setActivationState(4);
    }
  }

  physicsWorld.addRigidBody(body);
  return body;
}

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  updatePhys(dt);

  TWEEN.update();

  renderer.render(scene, cam);
}

function updatePhys(dt) {
  physicsWorld.stepSimulation(dt, 10);

  for (let i = 0; i < rigidBodies.length; i++) {
    const obj = rigidBodies[i];
    const body = obj.userData.physicsBody;
    const ms = body.getMotionState();

    if (ms) {
      ms.getWorldTransform(transformAux1);
      const p = transformAux1.getOrigin();
      const q = transformAux1.getRotation();
      obj.position.set(p.x(), p.y(), p.z());
      obj.quaternion.set(q.x(), q.y(), q.z(), q.w());
      obj.userData.collided = false;
    }
  }

  const now = clock.getElapsedTime();

  checkFallen(now);
  stabilize();

  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    if (now - b.spawnTime > 8) {
      removeObj(b.mesh);
      balls.splice(i, 1);
    }
  }

  for (const lane of lanes) {
    if (lane.resetScheduled && now >= lane.resetTime) {
      resetLane(lane.index);
      lane.resetScheduled = false;
    }
  }

  updateAuto(now);
}

function checkFallen(now) {
  const up = new THREE.Vector3(0, 1, 0);
  const temp = new THREE.Vector3();

  for (const lane of lanes) {
    for (const pin of lane.pins) {
      if (pin.userData.fallen) continue;

      temp.set(0, 1, 0).applyQuaternion(pin.quaternion);
      const dot = temp.dot(up);

      if (dot < 0.7) {
        pin.userData.fallen = true;
        lane.score += 1;
        lane.fallen += 1;
        updateLabel(lane);

        popLabel(lane);

        if (!lane.strikeShown && lane.fallen === lane.pins.length) {
          lane.strikeShown = true;
          showStrike(lane);
        }

        if (!lane.resetScheduled) {
          lane.resetScheduled = true;
          lane.resetTime = now + 3;
        }
      }
    }
  }
}

function popLabel(lane) {
  const el = lane.labelEl;
  const from = { s: 1.0 };
  const to = { s: 1.3 };

  new TWEEN.Tween(from)
    .to(to, 150)
    .yoyo(true)
    .repeat(1)
    .onUpdate((v) => {
      el.style.transform = `scale(${v.s})`;
    })
    .easing(TWEEN.Easing.Back.Out)
    .start();
}

function showStrike(lane) {
  const cnt = 15;

  let avgZ = 0;

  for (const pin of lane.pins) {
    const iz =
      pin.userData.initZ !== undefined ? pin.userData.initZ : pin.position.z;
    avgZ += iz;
  }
  avgZ /= lane.pins.length;

  const bz = avgZ - 2;
  const by = pinBaseY + pinHalfH * 0.5;

  for (let i = 0; i < cnt; i++) {
    const col = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
    const geom = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(geom, mat);

    const range = laneW * 0.6;
    const sx = lane.laneX + (Math.random() * 2 - 1) * (range * 0.5);
    const sy = by;
    const sz = bz;

    mesh.position.set(sx, sy, sz);
    scene.add(mesh);

    const from = {
      x: sx,
      y: sy,
      z: sz,
      s: 1.0,
      o: 1.0,
    };

    const to = {
      x: sx + (Math.random() * 2 - 1) * 3,
      y: sy + 10 + Math.random() * 5,
      z: sz + 6 + Math.random() * 4,
      s: 1.4,
      o: 0.0,
    };

    new TWEEN.Tween(from)
      .to(to, 900 + Math.random() * 400)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((v) => {
        mesh.position.set(v.x, v.y, v.z);
        mesh.scale.set(v.s, v.s, v.s);
        mesh.material.opacity = v.o;
      })
      .onComplete(() => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      })
      .start();
  }
}

function stabilize() {
  for (const lane of lanes) {
    for (const pin of lane.pins) {
      if (!pin.userData.fallen) continue;

      const body = pin.userData.physicsBody;

      const lv = body.getLinearVelocity();
      const av = body.getAngularVelocity();

      const spd = lv.x() * lv.x() + lv.y() * lv.y() + lv.z() * lv.z();
      const ang = av.x() * av.x() + av.y() * av.y() + av.z() * av.z();

      if (spd < 0.01 && ang < 0.25) {
        body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
        body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
        body.setActivationState(2);
      }
    }
  }
}

function removeObj(mesh) {
  const body = mesh.userData.physicsBody;
  physicsWorld.removeRigidBody(body);
  scene.remove(mesh);

  const idx = rigidBodies.indexOf(mesh);
  if (idx !== -1) rigidBodies.splice(idx, 1);
}

function resetLane(lIdx) {
  const lane = lanes[lIdx];

  for (let i = lane.pins.length - 1; i >= 0; i--) {
    const pin = lane.pins[i];
    removeObj(pin);
  }
  lane.pins.length = 0;

  lane.fallen = 0;
  lane.strikeShown = false;

  setupPins(lane);
}

function updateAuto(now) {
  for (const lane of lanes) {
    if (!lane.isAuto) continue;

    if (lane.nextShot === 0) {
      lane.nextShot = now + Math.random() * 3.0;
    }

    if (now >= lane.nextShot) {
      autoShoot(lane);

      const jit = Math.random() * 1.5 - 0.75;
      lane.nextShot = now + 6 + jit;

      if (lane.nextShot < now + 3) {
        lane.nextShot = now + 3;
      }
    }
  }
}

function autoShoot(lane) {
  const bMass = 35;
  const bRad = 0.4;

  const ball = new THREE.Mesh(new THREE.SphereGeometry(bRad, 14, 10), ballMat);
  ball.castShadow = true;
  ball.receiveShadow = true;

  const bShape = new Ammo.btSphereShape(bRad);
  bShape.setMargin(0.005);

  const range = laneW * 0.4;
  const offX = (Math.random() * 2 - 1) * (range * 0.5);
  const sx = lane.laneX + offX;
  const sy = 0.8;
  const sz = 30;

  pos.set(sx, sy, sz);
  quat.set(0, 0, 0, 1);

  const bBody = makeRigidBody(ball, bShape, bMass, pos, quat, null, null, true);

  const dir = new THREE.Vector3(
    (Math.random() * 2 - 1) * 0.15,
    (Math.random() * 2 - 1) * 0.05,
    -1
  ).normalize();

  const spd = 24;
  dir.multiplyScalar(spd);
  bBody.setLinearVelocity(new Ammo.btVector3(dir.x, dir.y, dir.z));

  bBody.setRestitution(0.2);
  bBody.setFriction(0.3);
  bBody.setDamping(0.01, 0.05);

  ball.userData.isBall = true;
  ball.userData.laneIndex = lane.index;

  balls.push({
    mesh: ball,
    body: bBody,
    laneIndex: lane.index,
    spawnTime: clock.getElapsedTime(),
  });
}

function onResize() {
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
