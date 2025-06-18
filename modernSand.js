// modernSand.js

// Import Three.js and FBXLoader using the bare specifiers defined in importmap
import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
const MOBILE_SAND_COUNT = 500; // Increased for more sand on mobile
const DESKTOP_SAND_COUNT = 9000;
const SAND_SIZE_MOBILE = 12;
const SAND_SIZE_DESKTOP = 3;
const TEXT_SAND_SIZE_MOBILE = 7;
const TEXT_SAND_SIZE_DESKTOP = 4;
const TEXT_SAND_COUNT_DESKTOP = 9000;
const TEXT_SAND_COUNT_MOBILE = 2000; // Increased for more text sand on mobile

document.addEventListener('DOMContentLoaded', () => {
  // --- Config ---
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;
  const SAND_SIZE = IS_MOBILE ? SAND_SIZE_MOBILE : SAND_SIZE_DESKTOP;
  const FBX_SAND_SIZE = 3;
  const HR_SAND_SIZE = 3;
  const TEXT_SAND_SIZE = IS_MOBILE ? TEXT_SAND_SIZE_MOBILE : TEXT_SAND_SIZE_DESKTOP;
  const EXAMPLE_IMAGE = {
    src: '/images/Cortana-H3.png',
    link: '/images/Cortana-H3.png',
    label: 'PNG Demo'
  };

// --- GLSL Shaders ---
const pointFormationVertexShader = `
  attribute vec3 startPosition;
  attribute vec3 targetPosition;
  attribute float startTime;
  attribute float random;

  uniform float uTime;
  uniform float uPointSize;
  uniform float uAnimationDuration;

  varying float vProgress;

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float timeElapsed = uTime - startTime;
    float progress = clamp(timeElapsed / uAnimationDuration, 0.0, 1.0);
    vProgress = progress;
    
    vec3 currentPosition = mix(startPosition, targetPosition, easeInOutCubic(progress));
    
    vec4 modelViewPosition = modelViewMatrix * vec4(currentPosition, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = uPointSize * (1.0 + random * 0.5) * (vProgress) * (200.0 / -modelViewPosition.z);
  }
`;

const pointFormationFragmentShader = `
  uniform vec3 uColor;
  varying float vProgress;

  void main() {
    if (vProgress < 0.01) discard;
    float alpha = vProgress;
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) {
        discard;
    }
    gl_FragColor = vec4(uColor, alpha * (1.0 - r));
  }
`;

const hourglassVertexShader = `
  attribute vec3 initialPosition;
  attribute vec3 bottomPosition;
  attribute float fallStartTime;

  uniform float uTime;
  uniform float uPointSize;
  uniform float uFallDuration;
  uniform float uRotationY;

  varying float vProgress;

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
  }

  void main() {
    float progress = 0.0;
    if (uTime > fallStartTime) {
      progress = clamp((uTime - fallStartTime) / uFallDuration, 0.0, 1.0);
    }
    vProgress = progress;

    vec3 currentPosition = mix(initialPosition, bottomPosition, easeInOutCubic(progress));
    currentPosition = rotateY(uRotationY) * currentPosition;

    vec4 modelViewPosition = modelViewMatrix * vec4(currentPosition, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = uPointSize * (200.0 / -modelViewPosition.z);
  }
`;

const hourglassFragmentShader = `
  uniform vec3 uColor;
  varying float vProgress;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) {
        discard;
    }
    gl_FragColor = vec4(uColor, 1.0 - r);
  }
`;


  // --- Modes ---
  const MODES = [
    { name: 'image', label: 'Website', color: '#ffd700' },
    { name: 'hourglass', label: 'Hourglass', color: '#00bfff' },
    { name: 'fbx', label: '3D Model', color: '#ff6f00' },
    { name: 'text', label: 'Text', color: '#b0e0e6' }
  ];
  let currentMode = 'image';

  // --- DOM Setup ---
  const starButtonsContainer = document.getElementById('star-buttons-container');

  function createStarButton(label, color, modeName) {
    const btn = document.createElement('button');
    btn.className = 'star-button-css';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.style.setProperty('--star-color', color);
    btn.addEventListener('click', () => switchMode(modeName));
    // Add orb gloss for glass effect
    const gloss = document.createElement('span');
    gloss.className = 'orb-gloss';
    btn.appendChild(gloss);
    return btn;
  }

  function startThreeShaderMode({
      pointSize,
      color,
      attributeGenerator,
      vertexShader,
      fragmentShader,
      updateUniforms
    }) {
    threeRenderer.setAnimationLoop(null);

    const geometry = new THREE.BufferGeometry();
    
    try {
        attributeGenerator(geometry);
    } catch (error) {
        console.error("Could not generate particle attributes.", error);
        return;
    }

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uPointSize: { value: pointSize },
            uColor: { value: new THREE.Color(color) },
            ...(updateUniforms?.initial), 
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    
    const points = new THREE.Points(geometry, material);
    threeScene.add(points);
    
    animationLoop = () => {
        material.uniforms.uTime.value = performance.now();
        if (updateUniforms?.onUpdate) {
            updateUniforms.onUpdate(material.uniforms, points);
        }
        threeRenderer.render(threeScene, threeCamera);
    };
    threeRenderer.setAnimationLoop(animationLoop);
  }


  function renderStarButtons() {
    starButtonsContainer.innerHTML = '';
    MODES.forEach(mode => {
      const btn = createStarButton(mode.label, mode.color, mode.name);
      starButtonsContainer.appendChild(btn);
    });
    starButtonsContainer.style.display = 'flex';
    starButtonsContainer.style.justifyContent = 'center';
    starButtonsContainer.style.marginBottom = '20px';
    starButtonsContainer.style.position = 'relative';
    starButtonsContainer.style.zIndex = '1000';
  }

  function enableStarButtons(enabled) {
    const btns = starButtonsContainer.querySelectorAll('button');
    btns.forEach(btn => btn.disabled = !enabled);
  }

  // --- Three.js setup for 3D hourglass and image mode ---
  let threeRenderer, threeScene, threeCamera;
  let imageInstancedMesh, hourglassInstancedMesh, fbxInstancedMesh; // Renamed to InstancedMesh
  const threeContainer = document.createElement('div');
  threeContainer.id = 'threejs-container';
  threeContainer.style.position = 'absolute';
  threeContainer.style.top = '0';
  threeContainer.style.left = '0';
  threeContainer.style.width = '100%';
  threeContainer.style.height = '100%';
  threeContainer.style.zIndex = '3';
  threeContainer.style.display = 'none';
  document.body.appendChild(threeContainer);

  // Make hourglass parameters global so animateHourglass can access them
  const hourglassHeight = 340;
  const hourglassRadius = 80;
  const neckRadius = 12;

  // Add global variables for hourglass center of mass
  let avgX = 0, avgY = 0;

  // --- Image mode with three.js ---
  let imageParticles = [];
  let imageAnimFrame = null; // Will be replaced by renderer.setAnimationLoop
  let imageState = null;
  let imageModeImageData = null;
  let imageModePixelTargets = [];
  const _imageMatrix = new THREE.Matrix4(); // Reusable matrix for performance
  const _imageColor = new THREE.Color();   // Reusable color for performance

  function setupThreeJS() {
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(45, CANVAS_WIDTH / CANVAS_HEIGHT, 1, 2000);
    threeCamera.position.set(0, 0, 700);
    threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    threeRenderer.setClearColor(0x000000, 0);
    threeRenderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    threeContainer.appendChild(threeRenderer.domElement);
  }
  setupThreeJS();

  function startThreeImageMode() {
    show3DCanvas();
    // Remove previous 3D objects
    if (hourglassInstancedMesh) { threeScene.remove(hourglassInstancedMesh); hourglassInstancedMesh.dispose(); hourglassInstancedMesh = null; }
    if (fbxInstancedMesh) { threeScene.remove(fbxInstancedMesh); fbxInstancedMesh.dispose(); fbxInstancedMesh = null; }
    if (imageInstancedMesh) { threeScene.remove(imageInstancedMesh); imageInstancedMesh.dispose(); imageInstancedMesh = null; }

    // Stop previous animation loops if they are running
    threeRenderer.setAnimationLoop(null); // Stop any ongoing loop
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const off = document.createElement('canvas');
        off.width = CANVAS_WIDTH;
        off.height = CANVAS_HEIGHT;
        const offCtx = off.getContext('2d');
        const aspect = img.width / img.height;
        const imgW = aspect > 1 ? CANVAS_WIDTH * 0.7 : CANVAS_HEIGHT * 0.7 * aspect;
        const imgH = aspect > 1 ? CANVAS_WIDTH * 0.7 / aspect : CANVAS_HEIGHT * 0.7;
        const imgX = (CANVAS_WIDTH - imgW) / 2;
        const imgY = (CANVAS_HEIGHT - imgH) / 2;
        offCtx.drawImage(img, imgX, imgY, imgW, imgH);
        const imageData = offCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

        let imageModePixelTargets = [];
        const step = IS_MOBILE ? 6 : 4;
        for (let y = 0; y < CANVAS_HEIGHT; y += step) {
            for (let x = 0; x < CANVAS_WIDTH; x += step) {
                if (imageData[(y * CANVAS_WIDTH + x) * 4 + 3] > 128) {
                    imageModePixelTargets.push({ x, y });
                }
            }
        }
        
        if (imageModePixelTargets.length === 0) {
            console.error("Image analysis resulted in zero target pixels. Check image path and transparency.");
            return;
        }

        startThreeShaderMode({
            pointSize: IS_MOBILE ? 8 : 10,
            color: '#ffd700',
            vertexShader: pointFormationVertexShader,
            fragmentShader: pointFormationFragmentShader,
            attributeGenerator: (geometry) => {
                const sandCount = IS_MOBILE ? MOBILE_SAND_COUNT : DESKTOP_SAND_COUNT;
                const startPositions = new Float32Array(sandCount * 3);
                const targetPositions = new Float32Array(sandCount * 3);
                const startTimes = new Float32Array(sandCount);
                const randoms = new Float32Array(sandCount);

                for (let i = 0; i < sandCount; i++) {
                    startPositions[i * 3 + 0] = (Math.random() - 0.5) * CANVAS_WIDTH;
                    startPositions[i * 3 + 1] = CANVAS_HEIGHT / 2 + Math.random() * 50;
                    startPositions[i * 3 + 2] = (Math.random() - 0.5) * 500;
                    
                    const target = imageModePixelTargets[i % imageModePixelTargets.length];
                    targetPositions[i * 3 + 0] = target.x - CANVAS_WIDTH / 2;
                    targetPositions[i * 3 + 1] = -target.y + CANVAS_HEIGHT / 2;
                    targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
                    
                    startTimes[i] = performance.now() + Math.random() * 1000;
                    randoms[i] = Math.random();
                }
                geometry.setAttribute('startPosition', new THREE.BufferAttribute(startPositions, 3));
                geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
                geometry.setAttribute('startTime', new THREE.BufferAttribute(startTimes, 1));
                geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));
            },
            updateUniforms: {
                initial: { uAnimationDuration: { value: 1500.0 } },
                onUpdate: (uniforms, points) => {
                    points.rotation.y += 0.001;
                }
            }
        });
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${EXAMPLE_IMAGE.src}. Make sure it is in the correct path.`);
    };
    img.src = EXAMPLE_IMAGE.src;
  }

  function animateThreeImage() {
    if (!imageState || !imageInstancedMesh) return;
    const now = performance.now();
    let allFloating = true;

    for (let i = 0; i < imageParticles.length; i++) {
      const p = imageParticles[i];
      if (!p.floating && now >= p.startTime) {
        p.floating = true;
      }
      if (p.floating) {
        // Move toward target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dz = p.targetZ - p.z;
        p.x += dx * 0.08;
        p.y += dy * 0.08;
        p.z += dz * 0.08;
        // If close enough, snap to target
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.5) {
          allFloating = false;
        }
      } else {
        allFloating = false;
      }

      _imageMatrix.setPosition(p.x, p.y, p.z);
      imageInstancedMesh.setMatrixAt(i, _imageMatrix);

      // If you want alpha to be applied per instance
      if (imageInstancedMesh.material.transparent) {
          imageInstancedMesh.material.opacity = p.alpha; // This applies to all, not per-instance.
                                                        // For per-instance alpha, a custom shader would be needed.
      }
    }
    imageInstancedMesh.instanceMatrix.needsUpdate = true;

    // Add a gentle rotation for magic effect
    imageInstancedMesh.rotation.y += 0.003;
    
    threeRenderer.render(threeScene, threeCamera);
    // setAnimationLoop handles the continuous calling, no need for requestAnimationFrame here.
  }

  // --- FBX Loader for 3D Model mode ---
  let fbxLoader = null;
  let fbxModel = null;
  let fbxSandParticles = [];
  const _fbxMatrix = new THREE.Matrix4(); // Reusable matrix for performance
  const _fbxColor = new THREE.Color();   // Reusable color for performance


  function startFBXModelMode() {
    // Clean up existing meshes
    if (hourglassInstancedMesh) { threeScene.remove(hourglassInstancedMesh); hourglassInstancedMesh.dispose(); hourglassInstancedMesh = null; }
    if (imageInstancedMesh) { threeScene.remove(imageInstancedMesh); imageInstancedMesh.dispose(); imageInstancedMesh = null; }
    if (fbxInstancedMesh) { threeScene.remove(fbxInstancedMesh); fbxInstancedMesh.dispose(); fbxInstancedMesh = null; }

    show3DCanvas();
    threeCamera.position.set(0, 0, 700);
    threeCamera.lookAt(0, 0, 0);
    threeRenderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    // Add ambient and directional light for FBX model visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, 1, 1);
    threeScene.add(ambientLight);
    threeScene.add(dirLight);

    // Stop previous animation loops if they are running
    threeRenderer.setAnimationLoop(null);

    if (!fbxLoader) {
      fbxLoader = new FBXLoader(); // Use imported FBXLoader
    }

    fbxLoader.load('https://threejs.org/examples/models/fbx/Samba Dancing.fbx', function (object) {
      fbxModel = object; // Store for potential future use, though not directly added to scene
      
      let points = [];
      // Sample points from the model's geometry
      // The FBX model often consists of multiple meshes. We need to traverse them.
      fbxModel.traverse(function(child) {
        if (child.isMesh && child.geometry && child.geometry.attributes.position) {
          const pos = child.geometry.attributes.position;
          const tempMesh = new THREE.Mesh(child.geometry);
          tempMesh.position.copy(child.position);
          tempMesh.rotation.copy(child.rotation);
          tempMesh.scale.copy(child.scale);
          tempMesh.updateMatrixWorld(true); // Ensure world matrix is up to date

          for (let i = 0; i < pos.count; i++) { // sample every vertex
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            v.applyMatrix4(tempMesh.matrixWorld); // Apply world transformation
            points.push({ x: v.x, y: v.y, z: v.z });
          }
        }
      });
      
      // Center and scale points
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const scaleFactor = Math.min(CANVAS_WIDTH / (maxX - minX), CANVAS_HEIGHT / (maxY - minY)) * 0.7; // Scale to fit canvas
      for (const p of points) {
        p.x = (p.x - centerX) * scaleFactor;
        p.y = (p.y - centerY) * scaleFactor;
        p.z = (p.z - centerZ) * scaleFactor;
      }

      // Prepare sand particles for InstancedMesh
      const sandCount = Math.min(points.length, IS_MOBILE ? MOBILE_SAND_COUNT : DESKTOP_SAND_COUNT);
      fbxSandParticles = [];
      let usedIndices = new Set();

      const particleGeometry = new THREE.BoxGeometry(FBX_SAND_SIZE, FBX_SAND_SIZE, FBX_SAND_SIZE);
      const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.95 });
      fbxInstancedMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, sandCount);
      fbxInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      threeScene.add(fbxInstancedMesh);

      for (let i = 0; i < sandCount; i++) {
        const idx = Math.floor(Math.random() * points.length);
        const target = points[idx]; // No need to check if usedIndices has idx, if we allow duplicates it's fine for appearance

        const particle = {
          x: Math.random() * CANVAS_WIDTH - CANVAS_WIDTH / 2,
          y: CANVAS_HEIGHT + Math.random() * 40 - CANVAS_HEIGHT / 2,
          z: (Math.random() - 0.5) * 40,
          targetX: target.x,
          targetY: target.y,
          targetZ: target.z,
          startTime: performance.now() + Math.random() * 1500,
          floating: false
        };
        fbxSandParticles.push(particle);

        _fbxMatrix.setPosition(particle.x, particle.y, particle.z);
        fbxInstancedMesh.setMatrixAt(i, _fbxMatrix);
      }
      fbxInstancedMesh.instanceMatrix.needsUpdate = true;
      

      // Animate sand particles to form the model using setAnimationLoop
      threeRenderer.setAnimationLoop(animateFBXSand);

    }, undefined, function (error) {
      console.error('FBX load error:', error);
    });
  }

  function animateFBXSand() {
    if (!fbxInstancedMesh) return;
    const now = performance.now();
    let allFloating = true;

    for (let i = 0; i < fbxSandParticles.length; i++) {
      const p = fbxSandParticles[i];
      if (!p.floating && now >= p.startTime) {
        p.floating = true;
      }
      if (p.floating) {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dz = p.targetZ - p.z;
        p.x += dx * 0.08;
        p.y += dy * 0.08;
        p.z += dz * 0.08;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.5) {
          allFloating = false;
        }
      } else {
        allFloating = false;
      }
      _fbxMatrix.setPosition(p.x, p.y, p.z);
      fbxInstancedMesh.setMatrixAt(i, _fbxMatrix);
    }
    fbxInstancedMesh.instanceMatrix.needsUpdate = true;

    fbxInstancedMesh.rotation.y += 0.003;
    // fbxSandMaterial.size is no longer applicable with InstancedMesh

    threeRenderer.render(threeScene, threeCamera);
    // Always keep animating for continuous rotation
  }


  // --- Cleanup function to stop all animations and dispose objects ---
  function cleanupAllModes() {
    // Stop the Three.js animation loop
    threeRenderer.setAnimationLoop(null);
    // Cancel 2D animation frame
    if (animationFrame2D) { cancelAnimationFrame(animationFrame2D); animationFrame2D = null; }

    // Remove and dispose all Three.js objects from the scene
    if (threeScene) { // Check if scene exists
      while (threeScene.children.length > 0) {
        const obj = threeScene.children[0];
        threeScene.remove(obj);
        // Dispose geometries and materials
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        // Dispose InstancedMesh resources
        if (obj.isInstancedMesh) {
            obj.dispose();
        }
      }
      // Clean up lights if added dynamically
      threeScene.children.forEach(child => {
        if (child.isLight) {
          threeScene.remove(child);
          child.dispose();
        }
      });
    }

    // Reset mode-specific arrays and state
    sandParticles = [];
    hourglassParticles = [];
    imageParticles = [];
    fbxSandParticles = []; // Clear FBX specific particles
    imageModePixelTargets = [];
    imgPixels = [];
    fbxModel = null;
    imageState = null;
    hourglassState = null;
    formingImage = false;
    sandReady = false;
    queuedMode = null;
  }

  // --- Update switchMode to call cleanupAllModes first ---
  function switchMode(modeName) {
    cleanupAllModes(); // Ensure thorough cleanup
    currentMode = modeName;
    const sandCanvas = document.getElementById('sand-canvas');
    if (modeName === 'image') {
      sandCanvas.style.display = '';
      hide3DCanvas();
      resetSand();
      start2DLoop();
      startImageMode(); // Note: This will now initiate Three.js Image Mode with InstancedMesh
    } else if (modeName === 'hourglass') {
      sandCanvas.style.display = 'none';
      show3DCanvas();
      startHourglassMode();
    } else if (modeName === 'fbx') {
      sandCanvas.style.display = 'none';
      show3DCanvas();
      startFBXModelMode();
    } else if (modeName === 'text') {
      sandCanvas.style.display = '';
      hide3DCanvas();
      resetSand();
      start2DLoop();
      startTextMode();
    } else {
      sandCanvas.style.display = '';
      hide3DCanvas();
    }
  }

  // --- Hourglass mode with three.js ---
  let hourglassParticles = [];
  let hourglassAnimFrame = null; // Will be replaced by renderer.setAnimationLoop
  let hourglassState = null;
  const _hourglassMatrix = new THREE.Matrix4(); // Reusable matrix for performance
  const _hourglassColor = new THREE.Color();   // Reusable color for performance


  function startHourglassMode() {
    // Clean up existing meshes
    if (hourglassInstancedMesh) { threeScene.remove(hourglassInstancedMesh); hourglassInstancedMesh.dispose(); hourglassInstancedMesh = null; }
    if (imageInstancedMesh) { threeScene.remove(imageInstancedMesh); imageInstancedMesh.dispose(); imageInstancedMesh = null; }
    if (fbxInstancedMesh) { threeScene.remove(fbxInstancedMesh); fbxInstancedMesh.dispose(); fbxInstancedMesh = null; }

    show3DCanvas();
    // --- Camera and renderer reset ---
    threeCamera.position.set(0, 0, 700);
    threeCamera.lookAt(0, 0, 0);
    threeRenderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stop previous animation loops if they are running
    threeRenderer.setAnimationLoop(null);

    const sandCount = IS_MOBILE ? MOBILE_SAND_COUNT : DESKTOP_SAND_COUNT;
    hourglassParticles = [];

    // Create InstancedMesh for hourglass
    const particleGeometry = new THREE.BoxGeometry(HR_SAND_SIZE, HR_SAND_SIZE, HR_SAND_SIZE);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.95 });
    hourglassInstancedMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, sandCount);
    hourglassInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    threeScene.add(hourglassInstancedMesh);


    for (let i = 0; i < sandCount; i++) {
      const h = Math.random() * 0.48 + 0.02;
      const theta = Math.random() * Math.PI * 2;
      const r = neckRadius + (hourglassRadius - neckRadius) * h;
      const particle = {
        y: -hourglassHeight * (0.5 - h),
        x: Math.cos(theta) * r,
        z: Math.sin(theta) * r,
        inTop: true,
        t: Math.random() * 2.5,
        fallStart: 0,
        fallDuration: 2000 + Math.random() * 1000,
        fallProgress: 0,
        yBot: 0, xBot: 0, zBot: 0 // Initialize target bottom positions
      };
      hourglassParticles.push(particle);

      _hourglassMatrix.setPosition(particle.x, particle.y, particle.z);
      hourglassInstancedMesh.setMatrixAt(i, _hourglassMatrix);
    }
    // Calculate avgX, avgY for centering, apply once at end for all particles
    let sumX = 0, sumY = 0;
    for (let i = 0; i < hourglassParticles.length; i++) {
      sumX += hourglassParticles[i].x;
      sumY += hourglassParticles[i].y;
    }
    avgX = sumX / hourglassParticles.length;
    avgY = sumY / hourglassParticles.length;
    for (let i = 0; i < hourglassParticles.length; i++) {
      hourglassParticles[i].x -= avgX;
      hourglassParticles[i].y -= avgY;
      _hourglassMatrix.setPosition(hourglassParticles[i].x, hourglassParticles[i].y, hourglassParticles[i].z);
      hourglassInstancedMesh.setMatrixAt(i, _hourglassMatrix);
    }

    hourglassInstancedMesh.instanceMatrix.needsUpdate = true;


    hourglassState = {
      rotation: 0,
      sandProgress: 0,
      lastUpdate: performance.now(),
      sandFallSpeed: 0.25
    };
    // Start the animation loop using setAnimationLoop
    threeRenderer.setAnimationLoop(animateHourglass);
  }

  function animateHourglass() {
    if (!hourglassState || !hourglassInstancedMesh) return;
    const now = performance.now();
    hourglassState.rotation += 0.012;
    const dt = (now - hourglassState.lastUpdate) / 1000;
    hourglassState.lastUpdate = now;
    hourglassState.sandProgress += dt / hourglassState.sandFallSpeed;
    if (hourglassState.sandProgress > 1) hourglassState.sandProgress = 1;

    for (let i = 0; i < hourglassParticles.length; i++) {
      const p = hourglassParticles[i];
      if (p.inTop && hourglassState.sandProgress > p.t) {
        p.inTop = false;
        p.fallStart = now;
        p.fallProgress = 0;
        const h = Math.random() * 0.48 + 0.02;
        const theta = Math.random() * Math.PI * 2;
        const r = neckRadius + (hourglassRadius - neckRadius) * h;
        let yBot = hourglassHeight * (0.5 - h);
        let xBot = Math.cos(theta) * r;
        xBot -= avgX;
        yBot -= avgY;
        p.yBot = yBot;
        p.xBot = xBot;
        p.zBot = Math.sin(theta) * r;
      }
      if (!p.inTop && p.fallProgress < 1) {
        p.fallProgress = Math.min(1, (now - p.fallStart) / p.fallDuration);
      }
      let ease = p.fallProgress < 0.5
        ? 4 * p.fallProgress * p.fallProgress * p.fallProgress
        : 1 - Math.pow(-2 * p.fallProgress + 2, 3) / 2;
      let y = p.inTop ? p.y : p.y * (1 - ease) + p.yBot * ease;
      let x = p.inTop ? p.x : p.x * (1 - ease) + p.xBot * ease;
      let z = p.inTop ? p.z : p.z * (1 - ease) + p.zBot * ease;
      
      const rot = hourglassState.rotation;
      const x3d = x;
      const z3d = z;
      const x2d = Math.cos(rot) * x3d - Math.sin(rot) * z3d;
      const z2d = Math.sin(rot) * x3d + Math.cos(rot) * z3d;
      
      _hourglassMatrix.setPosition(x2d, y, z2d);
      hourglassInstancedMesh.setMatrixAt(i, _hourglassMatrix);
    }
    hourglassInstancedMesh.instanceMatrix.needsUpdate = true;

    threeRenderer.render(threeScene, threeCamera);
  }

  function show3DCanvas() {
    threeContainer.style.display = 'block';
    threeContainer.style.zIndex = '10000';
    threeContainer.style.width = CANVAS_WIDTH + 'px';
    threeContainer.style.height = CANVAS_HEIGHT + 'px';
    threeContainer.style.left = '50%';
    threeContainer.style.top = '50%';
    threeContainer.style.transform = 'translate(-50%, -50%)';
  }
  function hide3DCanvas() {
    threeContainer.style.display = 'none';
  }

  // --- Sand State ---
  let sandParticles = [];
  let sandMode = 'fall'; // 'fall', 'float'
  let imageData = null;
  let imageLink = null;
  let formingImage = false;
  let imgPixels = [];
  let floatStartTime = 0;
  let sandReady = false;
  let queuedMode = null;

  function resetSand() {
    sandParticles = [];
    // Only cap sand count for image mode
    let sandCount;
    if (currentMode === 'image') { // This refers to the 2D "Website" mode
      sandCount = IS_MOBILE
        ? MOBILE_SAND_COUNT
        : Math.min(DESKTOP_SAND_COUNT, Math.floor((CANVAS_WIDTH * CANVAS_HEIGHT) / (SAND_SIZE * SAND_SIZE)));
    } else { // This is for 2D text mode (or default fall)
      sandCount = Math.floor((CANVAS_WIDTH * CANVAS_HEIGHT) / (SAND_SIZE * SAND_SIZE));
    }
    let sandAdded = 0;
    for (let y = 0; y < CANVAS_HEIGHT; y += SAND_SIZE) {
      for (let x = 0; x < CANVAS_WIDTH; x += SAND_SIZE) {
        if (IS_MOBILE && sandAdded >= MOBILE_SAND_COUNT) break;
        sandParticles.push({
          x: x,
          y: y,
          color: 'rgba(30,144,255,1)',
          vy: 0,
          vx: 0,
          glow: false,
          targetX: null,
          targetY: null,
          targetColor: null,
          startTime: 0,
          floating: false
        });
        sandAdded++;
      }
      if (IS_MOBILE && sandAdded >= MOBILE_SAND_COUNT) break;
    }
    sandMode = 'fall';
    imageData = null;
    imageLink = null;
    formingImage = false;
    imgPixels = [];
    floatStartTime = 0;
    sandReady = false;
    queuedMode = null;
  }


  let animationFrame2D = null;

  function resetSandFor2D() {
    sandParticles = [];
    let sandCount = IS_MOBILE ? TEXT_SAND_COUNT_MOBILE : TEXT_SAND_COUNT_DESKTOP;
    for (let i = 0; i < sandCount; i++) {
        sandParticles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * -CANVAS_HEIGHT,
          color: 'rgba(30,144,255,1)',
          vy: 0,
          targetX: null,
          targetY: null,
          floating: false,
          startTime: 0,
        });
    }
    sandMode = 'fall';
    formingImage = false;
  }

  function startImageMode() { // This is the 2D "Website" mode
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = CANVAS_WIDTH;
      off.height = CANVAS_HEIGHT;
      const offCtx = off.getContext('2d');
      offCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height) * 0.8;
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const imgX = (CANVAS_WIDTH - imgW) / 2;
      const imgY = (CANVAS_HEIGHT - imgH) / 2;
      offCtx.drawImage(img, imgX, imgY, imgW, imgH);
      imageData = offCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
      imageLink = EXAMPLE_IMAGE.link;
      sandMode = 'float';
      formingImage = true;
      floatStartTime = performance.now();
      imgPixels = [];
      // Only collect non-transparent pixels
      for (let y = 0; y < CANVAS_HEIGHT; y += SAND_SIZE) {
        for (let x = 0; x < CANVAS_WIDTH; x += SAND_SIZE) {
          const idx = (y * CANVAS_WIDTH + x) * 4;
          const a = imageData[idx + 3];
          if (a > 32) {
            imgPixels.push({ x, y, idx, a });
          }
        }
      }
      // Shuffle imgPixels for magical effect
      for (let i = imgPixels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [imgPixels[i], imgPixels[j]] = [imgPixels[j], imgPixels[i]];
      }
      // Cap sand count to a higher value for better density
      let desiredSandCount = IS_MOBILE ? MOBILE_SAND_COUNT : DESKTOP_SAND_COUNT;
      let actualSandCount = Math.min(imgPixels.length, desiredSandCount);

      sandParticles = [];
      if (imgPixels.length > 0) {
        // Calculate step based on actual desired sand count
        let step = Math.max(1, Math.floor(imgPixels.length / actualSandCount));
        for (let i = 0; i < actualSandCount; i++) {
          const px = imgPixels[i * step]; // Sample pixels with the calculated step
          const idx = px.idx;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = imageData[idx + 3];
          sandParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: CANVAS_HEIGHT + Math.random() * 40,
            color: `rgba(${r},${g},${b},${a / 255})`,
            vy: 0,
            vx: 0,
            glow: true,
            targetX: px.x,
            targetY: px.y,
            targetColor: `rgba(${r},${g},${b},${a / 255})`,
            startTime: floatStartTime + Math.random() * 1500,
            floating: false
          });
        }
      }
    };
    img.src = EXAMPLE_IMAGE.src;
  }

  function start2DLoop() {
    const canvas = document.getElementById('sand-canvas');
    const ctx = canvas.getContext('2d');
    function animate2D(now) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      sandParticles.forEach(p => {
        // Draw blue tint only where sand particles are (magical effect)
        let size = (currentMode === 'text' && sandMode === 'float' && formingImage) ? TEXT_SAND_SIZE : SAND_SIZE;
        if (sandMode === 'float' && formingImage) {
          ctx.save();
          ctx.globalAlpha = 0.15; // Adjust for desired tint strength
          ctx.fillStyle = 'rgba(30,144,255,1)';
          ctx.fillRect(p.x, p.y, size, size);
          ctx.restore();
        }
        if (sandMode === 'fall') {
          if (p.y + SAND_SIZE < CANVAS_HEIGHT) {
            p.vy += 0.2 + Math.random() * 0.1;
            p.y += p.vy;
          } else {
            p.vy = 0;
            p.y = CANVAS_HEIGHT - SAND_SIZE;
          }
          p.color = 'rgba(30,144,255,1)';
          p.glow = false;
          p.floating = false;
        } else if (sandMode === 'float' && formingImage) {
          if (!p.floating && now >= p.startTime) {
            p.floating = true;
          }
          if (p.floating && p.targetX !== null && p.targetY !== null) {
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            p.x += dx * 0.08;
            p.y += dy * 0.08;
            p.color = p.targetColor || 'rgba(30,144,255,0.7)';
          }
        }
        ctx.save();
        if (p.glow && p.floating) {
          ctx.shadowColor = 'rgba(30,144,255,0.5)';
          ctx.shadowBlur = 32;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, size, size);
        ctx.restore();
      });
      if (sandMode === 'fall') {
        let allSettled = sandParticles.every(p => p.y >= CANVAS_HEIGHT - SAND_SIZE - 0.1);
        if (allSettled && !sandReady) {
          sandReady = true;
          enableStarButtons(true);
          if (queuedMode) {
            switchMode(queuedMode);
            queuedMode = null;
          }
        }
      }
      animationFrame2D = requestAnimationFrame(animate2D);
    }
    animationFrame2D = requestAnimationFrame(animate2D);
  }

  function startTextMode() {
    let text = IS_MOBILE 
        ? "Tom Riddle Spells Voldemort"
        : "Sand is a granular material composed of finely divided rock and mineral particles.";

    const off = document.createElement('canvas');
    off.width = CANVAS_WIDTH;
    off.height = CANVAS_HEIGHT;
    const offCtx = off.getContext('2d');
    
    let fontSize = IS_MOBILE ? 72 : 44;
    let lineHeight = IS_MOBILE ? 80 : 52;
    let maxWidth = CANVAS_WIDTH * 0.92;
    
    offCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    let lines = [];
    let words = text.split(' ');
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        let testLine = currentLine + " " + words[i];
        if (offCtx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);

    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'top';
    offCtx.fillStyle = '#fff';
    const totalHeight = lines.length * lineHeight;
    let y = (CANVAS_HEIGHT - totalHeight) / 2;
    lines.forEach(line => {
        offCtx.fillText(line, CANVAS_WIDTH / 2, y);
        y += lineHeight;
    });

    const textImageData = offCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    let textPixels = [];
    for (let y = 0; y < CANVAS_HEIGHT; y += TEXT_SAND_SIZE) {
        for (let x = 0; x < CANVAS_WIDTH; x += TEXT_SAND_SIZE) {
            if (textImageData[(y * CANVAS_WIDTH + x) * 4 + 3] > 128) {
                textPixels.push({ x, y });
            }
        }
    }
    
    sandMode = 'float';
    formingImage = true;
    floatStartTime = performance.now();

    sandParticles.forEach((p, i) => {
        const target = textPixels[i % textPixels.length];
        if (target) {
          p.targetX = target.x;
          p.targetY = target.y;
        }
        p.color = 'rgba(30, 144, 255, 1)';
        p.startTime = floatStartTime + Math.random() * 1500;
        p.floating = false;
    });
  }



  // --- Init ---
  renderStarButtons();
  resetSand();
  enableStarButtons(true);
  start2DLoop();
  // The star buttons will be enabled after the sand settles, as before.

  // Add debug log to confirm script loaded.
  console.log('[modernSand.js] Loaded and ready.');
 
  // Set canvas size and transparent background
  const sandCanvas = document.getElementById('sand-canvas');
  sandCanvas.width = CANVAS_WIDTH;
  sandCanvas.height = CANVAS_HEIGHT;
  sandCanvas.style.background = 'transparent';
});