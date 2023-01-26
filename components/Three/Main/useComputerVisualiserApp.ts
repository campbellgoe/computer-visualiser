import * as THREE from 'three';
import { useEffect, useRef, useState } from "react"
import initialiseScene from "./initialiseScene";
import { fragmentShaderTopBoilerplate, vertexShaderMain } from './shaderParts';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
// import { Flow } from "three/examples/jsm/modifiers/CurveModifier"
// import initRapier from './initRapier';
// import { scrollbarWidthPx } from '../../../utils/padding.globals';


import easeInOutExpo from 'eases/expo-in-out'
import easeInOutCubic from 'eases/cubic-in-out'
import { scrollbarWidthPx } from '../../../utils/padding.globals';
// import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
// import { createMultiMaterialObject } from "three/examples/jsm/utils/SceneUtils.js";


function useThree({ enableShader, glsl, initialCompileNumber = 0, setThreeApp, onProgress, showPopup, gui }) {
  const cleanupFn = useRef(() => null)
  const [compileNumber, setCompileNumber] = useState(initialCompileNumber)
  const stopRender = useRef(false)
  const debounceId = useRef(null)
  const onLoopFn = useRef(() => null)
  const totalLoadedPercent = useRef(0)
  const ramHighlight = useRef(null)
  const gpuHighlight = useRef(null)
  const dragDist = useRef(100)
  useEffect(() => {
    const debounceInterval = 50
    stopRender.current = true
    clearTimeout(debounceId.current)
    debounceId.current = setTimeout(() => {
      stopRender.current = false
      setCompileNumber(index => index + 1)
    }, debounceInterval)
  }, [glsl])
  useEffect(() => {
    if (typeof window != 'undefined' && !stopRender.current && gui) {

      const init = async () => {
        const uniforms = {
          iTime: { type: 'float', value: 0 },
          iResolution: { type: 'vec2', value: new THREE.Vector2() }
        }
        const fragmentUniforms = Object.entries(uniforms).map(([uniformName, { type }]) => `uniform ${type} ${uniformName};`).join('\n')

        const vertexShader = vertexShaderMain

        const fragmentShader = `
          ${fragmentShaderTopBoilerplate}

          ${fragmentUniforms}

          ${glsl}
        `
        const threeApp = await initialiseScene(enableShader ?
          {
            uniforms,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
            transparent: true,
            vertexShader,
            fragmentShader,
          } :
          null,
          {
            onInit: async ({ scene, camera, renderer, shaderMaterialOptions, useFocalLength, }) => {
              let gpuX = 0.09
              let gpuY = -0.62
              let gpuZ = -0.08
              let cpuX = 0.16
              let cpuY = 0.69
              let cpuZ = 0.03
              let motherboardX = -0.562
              let motherboardY = 2.691
              let motherboardZ = -0.81
              let motherboardScale = 0.775
              const maxRamSticks = 4
              const maxGpus = 2
              let ramX = 0.9
              let ramY = 0.75
              let ramZ = 0.24
              const ramStart = ramZ
              const ramEnd = 2
              const ramStep = 0.01
              const gpuStart = gpuZ
              const gpuEnd = 1
              const loadingManager = THREE.DefaultLoadingManager

              renderer.shadowMap.enabled = true
              renderer.shadowMap.type = THREE.PCFSoftShadowMap
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 1
              renderer.outputEncoding = THREE.sRGBEncoding;

              const pmremGenerator = new THREE.PMREMGenerator( renderer );
              pmremGenerator.compileEquirectangularShader();
              loadingManager.onLoad = function ( ) {
                console.log('loaded')
                pmremGenerator.dispose();
              };
              loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                totalLoadedPercent.current = itemsLoaded/(itemsTotal*1.1)*100
                onProgress(totalLoadedPercent.current)
              }
              const exrLoader = new EXRLoader()
              console.log('loading env map...')
              const envMapTexture = await exrLoader.loadAsync('/env_maps/studio_small_03_4k.exr')
              envMapTexture.mapping = THREE.EquirectangularReflectionMapping;
      
              const exrCubeRenderTarget = pmremGenerator.fromEquirectangular( envMapTexture );
              //  envMapTexture
              
              const envMap = exrCubeRenderTarget.texture

              console.log('env map loaded')

              const white = new THREE.Color(0xffffff)
              const black = new THREE.Color(0x000000)
              gui.add(scene, 'background', {white, black, envMap}).onChange(value => {
                scene.background = value
              }).setValue(black)

              const orbitControls = new OrbitControls(camera, renderer.domElement);
              orbitControls.update();
              const transformControls = new TransformControls(camera, renderer.domElement );

              transformControls.addEventListener( 'dragging-changed', function ( event ) {
                console.log('transform controls updated')
                orbitControls.enabled = !event.value;

              } );
              scene.add(transformControls)
              // gui.add(myObject, "myBoolean"); // Checkbox
              // gui.add(myObject, "myFunction"); // Button
              // gui.add(myObject, "myString"); // Text Field


              // Create color pickers for multiple color formats
              // const colorFormats = {
              //   string: "#ffffff",
              //   int: 0xffffff,
              //   object: { r: 1, g: 1, b: 1 },
              //   array: [1, 1, 1],
              // };

              // gui.addColor(colorFormats, "string");
              

              gui.add(renderer, 'toneMappingExposure', 0, 3, 0.1).onChange(value => {
                renderer.toneMappingExposure = value
              })

             

              let shaderGeometry = null
              let shaderMaterial = null
              let shaderMesh = null
              if (shaderMaterialOptions) {
                shaderGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
                shaderMaterial = new THREE.ShaderMaterial(shaderMaterialOptions);
                shaderMesh = new THREE.Mesh(shaderGeometry, shaderMaterial);
                shaderMesh.position.z = -1
                camera.add(shaderMesh);
              }
              if (useFocalLength) {
                const focalLength =
                  (window.innerHeight / 2) / Math.tan(
                    0.5 * camera.fov * (Math.PI / 180)
                  );

                // at this distance the plane matches the screen exactly
                camera.position.z = focalLength;
              } else {
                camera.position.z = -5
                camera.position.y = 1
                camera.rotation.x = Math.PI / 2
              }
              scene.add(camera)


              // const material = new THREE.MeshStandardMaterial({ color: 0xffff00 })
              // const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
              // const cube = new THREE.Mesh(geometry, material)


              // scene.add(cube)


              const ambientLight = new THREE.AmbientLight(0x404040, 2); // light
              scene.add(ambientLight);

              const hemisphereLight = new THREE.HemisphereLight(0xff9966, 0x404040, 1); // light
              scene.add(hemisphereLight);

              const directionalLight = new THREE.DirectionalLight(0xffffff, 4); // light
              //scene.add(directionalLight);
              const directionalShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
              scene.add(directionalShadowHelper)
              directionalLight.castShadow = true
              directionalLight.shadow.mapSize.width = 1024; // 512 default
              directionalLight.shadow.mapSize.height = 1024; //512 default
              directionalLight.shadow.camera.near = 1; // .5 default
              directionalLight.shadow.camera.far = 10; // 500 default
              directionalLight.position.x = -80
              directionalLight.position.z = -40
              directionalLight.position.y = 90

              const targetObject = new THREE.Object3D();
              targetObject.position.x = 0
              targetObject.position.z = 0
              targetObject.position.y = 0
              directionalLight.target = targetObject;
              scene.add(directionalLight.target);
              // const geometry = new THREE.PlaneGeometry( window.innerWidth/3, window.innerHeight/3, window.innerWidth/30, window.innerHeight/30 );
              // const canvasTexture = createCanvasTexture()
              // const material = new THREE.MeshStandardMaterial( {color: 0xffffff, side: THREE.DoubleSide, map: canvasTexture, displacementMap: canvasTexture, displacementScale: window.innerWidth/30} );
              // const plane = new THREE.Mesh( geometry, material );
              // scene.add( plane )

              
              // RectAreaLightUniformsLib.init();
              // const rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 2, 5);
              // rectLight1.position.set(-3, 0, 5);
              // scene.add(rectLight1);

              // const { world, rigidBody, sampleMesh } = await initRapier(scene)

              const gltfLoader = new GLTFLoader()
              const fbxLoader = new FBXLoader()
              
              const modelsToLoad = [
                '/models/fractal_design.pc_case.glb',
                '/models/motherboard-rog-strix.glb',
                '/models/amd_sempron/amd_sempron_normal.glb',
                '/models/cpu-cooler-red.glb',
                //'/models/cpu-heatsink-cooler.glb',
                //'/models/RAM.glb',
                '/models/kingston_hyperx_fury_black_ram_module/scene.gltf',
                '/models/gpu_RTX_2080Ti.glb',
                '/models/hdd.glb',
                '/models/600wattpsu.glb'
              ]//'/models/CPU-2b.glb']//'020223_amd_sempron.glb']
              const PC_CASE_INDEX = modelsToLoad.findIndex(url => url.endsWith('.pc_case.glb'))
              const RAM_INDEX = modelsToLoad.findIndex(url => url.endsWith('ram_module/scene.gltf'))
              let models = await Promise.all(modelsToLoad.map(url => {
                let loader
                if(url.endsWith('.glb') || url.endsWith('.gltf')) loader = gltfLoader
                if(url.endsWith('.fbx')) loader = fbxLoader
                return loader.loadAsync(url)
              }))
              let glassMeshes = []
              const SIDE_PANE_INDEX = 1
              const processSceneChildren = (meshOrGroup, index) => {
                
                meshOrGroup.traverse(function (child) {
                  
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                  }
                  if ( index === PC_CASE_INDEX && child.material ) {
                   console.log('child.material.opacity', child.material.opacity)
                   if(child.material.opacity < 1){
                    glassMeshes.push(child)
                   }
                  }
                  if(child.material){
                    // if(child.material.metalness){
                    //   child.material.metalness *= 0.95;
                    // }
                    child.material.envMapIntensity = child.material.metalness//child.material.metalness ||//apply env map to all textures?
                    child.material.envMap = envMap
                  }
                })
                // don't add to scene this model since it is being added dynamically
                if(index !== RAM_INDEX){
                  scene.add(meshOrGroup)
                }
              }
              models = models.map((model, index) => {
                let mesh = model
                if('scene' in model){
                  mesh = model.scene
                }
                processSceneChildren(mesh, index)
                return mesh
              })
              console.log('loaded models', models)
              const sideGlassPane = glassMeshes[SIDE_PANE_INDEX]
              // 
              sideGlassPane.material.color.set(new THREE.Color(0x060606))
              sideGlassPane.userData = {
                opacity: sideGlassPane.material.opacity,
                prevIntersected: {
                  colour: new THREE.Color(sideGlassPane.material.color),
                  mesh: null,
                }
              }
              console.log('PREV INTER', sideGlassPane.userData.prevIntersected)
              
             
              const [pcCase, motherboard, cpu, cooler, ram, gpu, hdd, psu] = models
              const psuScale = 0.4
              psu.scale.set(psuScale, psuScale, psuScale)
              psu.rotation.set(0, Math.PI/2, 0)

              const psuX = 1.5
              const psuY = -.85
              const psuZ = .3

              const positionPSU = (x, y, z) => {
                psu.position.set(x, y, z)
              }
              

              positionPSU(psuX, psuY, psuZ)

              const hddX = 0.2
              const hddY = -1
              const hddZ = -0.1
              
              const myObject = {
                // myBoolean: true,
                // myFunction: function () {},
                // myString: "lil-gui",
                //coolerY: 0.4
                nRamSticks: 2,
                nGpus: 1,
                psuX,
                psuY,
                psuZ,
                hddX,
                hddY,
                hddZ,
                gpuX,
                gpuY,
                gpuZ,
                explode: 0,
                explodeFn: () => onLoopFn.current(),
                motherboardX,
                motherboardY,
                motherboardZ,
                motherboardScale,
                cpuX,
                cpuY,
                cpuZ,
                ramX,
                ramY,
                ramZ,
                enableShadowHelpers: false,
                sideGlassPaneFrame: 0,
                guiState: {
                  status: 'loading'
                },
              };

              
              console.log('motherboard', motherboard)
              const setMeshAsHighlight = child => {
                child.material = new THREE.MeshBasicMaterial(0xddff99)
                child.material.opacity = 0.5
                child.material.transparent = true
              }
              const initialiseHighlight = (group, componentName = 'computer') => {
                const groupBase = group.clone()
                groupBase.traverse(child => {
                  if(child.isMesh){
                    child.userData = {
                      ["is"+componentName+"Part"]: true
                    }
                    setMeshAsHighlight(child)
                    if(componentName === 'ram'){
                      child.scale.set(1.1,1.05,1.05)
                    } else if(componentName === 'psu'){
                      //child.position.y += 0.5
                    }
                  }
                })
                if(componentName === 'psu'){
                  groupBase.position.set(0, 0, 0)
                  groupBase.scale.set(1.01,1.01,1.01)
                  groupBase.rotation.set(0, Math.PI*2, 0)
                }
                // if(componentName !== 'sideGlassPane' && componentName !== "psu" && componentName !== "hdd" && componentName !== 'ram' && componentName !== 'gpu'){
                //   groupBase.scale.set(1.01,1.01,1.1)
                //   groupBase.position.z += 0.01
                // } else if(componentName === 'ram'){
                //   // groupBase.position.z -= 0.075
                //   // groupBase.position.x -= 0.09
                //   // groupBase.position.y -= 0.05
                // } else {
                //   groupBase.scale.set(1.01,1.01,1.01)
                // }
                

                //scene.add(groupBase)
                group.add(groupBase)
                return groupBase
              }

              // const sideGlassPaneGroup = new THREE.Group()
              // sideGlassPaneGroup.add(sideGlassPane)

              const sideGlassPaneHighlight = initialiseHighlight(sideGlassPane, "sideGlassPane")

              const motherboardHighlight = initialiseHighlight(motherboard, "motherboard")

              const cpuHighlight = initialiseHighlight(cpu, 'cpu')

              const coolerHighlight = initialiseHighlight(cooler, 'cooler')

              const hddHighlight = initialiseHighlight(hdd, 'hdd')

              const psuHighlight = initialiseHighlight(psu, 'psu')
              // const makeProcessGroup = (group) => {
              //   const cleanups = []
              //   const processGroup = (processMesh) => {
              //     group.traverse(child => {
              //       if(child.isMesh){
              //         cleanups.push(processMesh(child))
              //       }
              //     })
              //     return () => {
              //       cleanups.forEach(cleanup => {
              //         cleanup()
              //       })
              //     }
              //   }
              //   return processGroup
              // }
              // const processMotherboard = makeProcessGroup(motherboardGroup)
             
              
              const explodeSideGlassPane = (frame, maxFrame) => {
                const t = frame/maxFrame
                const [
                  [ta, { distance: da, coord: ca }],
                  [tb, { distance: db, coord: cb }]
                ] = [
                  [0.1, { distance: 0.1, coord: 'y' }],
                  [1, { distance: -2.5, coord: 'z' }]
                ]
                if(t < ta){
                  sideGlassPane.position[ca] = t*(1/ta)*da
                }
                sideGlassPane.position[cb] = (t)*(1/(1-ta))*db
                sideGlassPane.material.opacity = sideGlassPane.userData.opacity*(1-t)*.5+.5
              }
              const explodeGPU = (frame, maxFrame) => {
                const t = frame/maxFrame
                const distance = 4
                positionGpuZ(gpuZ + t * distance)
              }
              const explodeCPU = (frame, start, end) => {
                const frames = end-start
                const t = frame/frames
                const distance = 1
                // console.log('cpu t', t)
                positionCpu(myObject.cpuX, myObject.cpuY, myObject.cpuZ + t*distance)
              }
              const explodeRAM = (frame, maxFrame) => {
                const t = frame/maxFrame
                const distance = ramEnd-ramStart
                positionRamZ(ramStart + t * distance)
              }
              const explodeHDD = (frame, maxFrame) => {
                const t = frame/maxFrame
                const x = myObject.hddX
                const y = myObject.hddY
                const z = myObject.hddZ
                const xDistance = 3
                const yDistance = 1.5
                const zDistance = -3.5
                const breakpoint = 0.5
                if(frame < maxFrame*breakpoint){
                  positionHdd(
                    x + t * 2 * xDistance,
                    y,
                    z
                  )
                } else if(frame < maxFrame){
                  positionHdd(
                    x + xDistance,
                    y + (t-breakpoint)*2 * yDistance,
                    z + (t-breakpoint)*2 * zDistance,
                  )
                  hdd.rotation.set(0, Math.PI/2 + (t-breakpoint)*(1/breakpoint)*Math.PI/2, 0)
                }
                
              }
              const explodePSU = (frame, maxFrame) => {
                const t = frame/maxFrame
                const x = myObject.psuX
                const y = myObject.psuY
                const z = myObject.psuZ
                const xDistance = 2
                const yDistance = 0.5
                const zDistance = -1.5
                const breakpoint = 0.2
                if(frame < maxFrame*breakpoint){
                  positionPSU(
                    x + t * (1/breakpoint) * xDistance,
                    y,
                    z
                  )
                } else if(frame < maxFrame){
                  positionPSU(
                    x + xDistance,
                    y + (t-breakpoint)*(1/breakpoint) * yDistance,
                    z + (t-breakpoint)*(1/breakpoint) * zDistance,
                  )
                  psu.rotation.set(0, Math.PI/2 + (t-breakpoint)*(1/breakpoint)*Math.PI/4, 0)
                }
                
              }
              const explodeMotherboard = (frame, maxFrame) => {
                const t = frame/maxFrame
                const distance = 4
                motherboard.position.setZ(motherboardZ + t * distance)
              }

              let frame = 0
              const maxFrame = 300
              const gpuMaxFrame = maxFrame
              const sideGlassPaneMaxFrame = maxFrame*0.2
              const cpuStartFrame = maxFrame*0.1
              const cpuEndFrame = maxFrame
              const ramMaxFrame = maxFrame
              const hddMaxFrame = maxFrame
              const psuMaxFrame = maxFrame
              let direction = -1
              let explodeController = null
              const explodeFn = () => {
                console.log('setting explode animation loop')
                
                direction *= -1
                onLoopFn.current = () => {
                  if(frame > maxFrame) {
                    myObject.guiState.status = 'idle'
                    frame = maxFrame
                    return
                  }
                  const t = frame/maxFrame
                  const easedT = easeInOutExpo(t)
                  const easedFrame = frame * easedT
                  //console.log('t', t, 'eased', easedT, 'frame', frame, 'easedFrame', easedFrame)
                  explodeMotherboard(easedFrame, maxFrame)
                  //console.log('explodeFn easedFrame', easedFrame)
                 
                  if(easedFrame <= sideGlassPaneMaxFrame){
                    explodeSideGlassPane(easedFrame, sideGlassPaneMaxFrame)
                  }
                  if(easedFrame <= gpuMaxFrame){
                    explodeGPU(easedFrame, gpuMaxFrame)
                  }

                  if(easedFrame <= ramMaxFrame){
                    explodeRAM(easedFrame, ramMaxFrame)
                  }
                  
                  if(easedFrame >= cpuStartFrame && easedFrame <= cpuEndFrame){
                    explodeCPU(easedFrame-cpuStartFrame, cpuStartFrame, cpuEndFrame)
                  }
                  if(easedFrame <= hddMaxFrame){
                    explodeHDD(easedFrame, hddMaxFrame)
                  }
                  if(easedFrame <= psuMaxFrame){
                    explodePSU(easedFrame, psuMaxFrame)
                  }
                  if(easedFrame === 0){
                    explodeCPU(0, cpuStartFrame, cpuEndFrame)
                    if(myObject.guiState.status === 'loading'){
                      // gui.add(myObject, 'sideGlassPaneFrame', 0, sideGlassPaneMaxFrame, 1).onChange(value => {
                      //   explodeSideGlassPane(value, sideGlassPaneMaxFrame)
                      // })
                      explodeController = gui.add(myObject, "explode", 0, maxFrame, 1).onChange(frame => {
                        // motherboard.position.setY(value*2.3)
                        // updateGpuVisibility(value+gpuY)
                        // positionRamZY(value+ramStart)
                        // positionCpuY(value+cpuY)
                        //motherboard.position.setY(-(value - gpuY) / 12)
                        console.log('explode frame', frame)
                        explodeMotherboard(frame, maxFrame)
                        explodeSideGlassPane(frame, sideGlassPaneMaxFrame)
                        explodeGPU(frame, gpuMaxFrame)
                        explodeCPU(frame, cpuStartFrame, cpuEndFrame)
                        explodeRAM(frame, ramMaxFrame)
                        explodeHDD(frame, hddMaxFrame)
                        explodePSU(frame, psuMaxFrame)
                        onLoopFn.current = () => null
                      })
                      // gui.add(myObject, "motherboardZ", -3+motherboardZ, 3+motherboardZ, 0.001).onChange(value => {
                      //   motherboard.position.setZ(value)
                      // })
                      // gui.add(myObject, "cpuZ", 0, 1, 0.01).onChange(value => {
                      //   positionCpu(myObject.cpuX, myObject.cpuY, value)
                      // })
                    positionRamX(myObject.nRamSticks, ramX)
                    positionRamY(ramY)
                    positionRamZ(ramZ)

                    positionGpuX(gpuX)
                    updateGpuVisibility(myObject.nGpus)
                    positionGpuZ(gpuZ)
                    // gui.add(myObject, "ramX", -1, 1, 0.01).onChange(value => {
                    //   positionRamX(myObject.nRamSticks, value)
                      
                    //   console.log('ramX', ramSticks[0].position.x)
                    // })
                    // gui.add(myObject, "ramY", -1, 1, 0.01).onChange(value => {
                    //   console.log('ramY', value)
                    //   positionRamY(value)
                    // })
                    // gui.add(myObject, "ramZ", ramStart, ramEnd, ramStep).onChange(value => {
                    //   positionRamZ(value)
                    //   console.log('ramZ', ramSticks[0].position.z)
                    // })
                      // gui.add(myObject, "gpuZ", 0, 3, 0.01).onChange(value => {
                      //   gpu.position.setZ(value)
                      // })
                      
                      // gui.add(myObject, "motherboardScale", 0, 1, 0.001).onChange(value => {
                      //   motherboard.scale.set(value, value, value)
                      // })
                    }
                  }
                  myObject.guiState.status = 'animating'
                  
                  myObject.explode = easedFrame
                  explodeController.updateDisplay()
                  frame += direction
                  if(frame < 0){
                    frame = 0
                  }
                }
              }
              myObject.explodeFn = explodeFn
              const POINT_SIZE = 0.1
              // explodeFn()
              const createPoints = () => {
                const vertices = []
                const sizes = []
                const size = 32
                const spread = 20
                for(let ix =0;ix <= size; ix++){
                  for(let iy =0;iy <= size; iy++){
                    for(let iz =0;iz <= size; iz++){
                
                      const x = (ix/size) * spread - spread/2
                      const y = (iy/size) * spread - spread/2
                      const z = (iz/size) * spread - spread/2
                        vertices.push(x, y, z)
                        sizes.push(POINT_SIZE)
                    }
                  }
                }
                const geometry = new THREE.BufferGeometry()
                geometry.setAttribute(
                  'position',
                  new THREE.Float32BufferAttribute(vertices, 3)
                )
                geometry.setAttribute(
                  'size',
                  new THREE.Float32BufferAttribute(sizes, 1)
                )

                
                const material = new THREE.PointsMaterial({
                  size: POINT_SIZE,
                  color: 0xaaaaaa,
                  opacity: 0.3,
                  transparent: true,
                  sizeAttenuation: true
                })

                material.onBeforeCompile = shader => {
                  shader.vertexShader =
                    shader.vertexShader.replace('uniform float size;', 'attribute float size;')
                }

                const points = new THREE.Points(geometry, material)
                return points
              }

              // const scrollPos = {
              //   y: 0
              // }
              // window.addEventListener('scroll', () => {
              //   scrollPos.y = 
              // })

              const setupRaycasterAndPointer = () => {
                const raycaster = new THREE.Raycaster()
                const pointer = new THREE.Vector2()

                const onPointerMove = e => {
                  // TODO: might need to change this if canvas is not screen width
                  pointer.x = ((e.clientX - e.target.offsetLeft) / (window.innerWidth-scrollbarWidthPx)) * 2 - 1
                  pointer.y = - ((e.clientY - e.target.offsetTop + window.scrollY) / window.innerHeight) * 2 + 1
                }
                renderer.domElement.addEventListener('pointermove', onPointerMove)
                return [raycaster, pointer, () => {
                  renderer.domElement.removeEventListener('pointermove', onPointerMove)
                }]
              }
              
              const createLights = () => {
                const topPointLights = [
                  new THREE.PointLight(0xffffff, 8, 15),
                  new THREE.PointLight(0xffffff, 8, 15),
                  new THREE.PointLight(0xffffff, 8, 15),
                ].map((pointGlow, index, arr) => {
                  const len = arr.length
                  const span = 8
                  const x = (index/len-.5)*span+1.5
                  const y = Math.cos((index+.5)/len*Math.PI*2-Math.PI)/2*3+4
                  const z = 0
                  pointGlow.position.set(x,y,z)
                  pointGlow.castShadow = true
                  return pointGlow
                })
                const centralPointLights = [
                  [
                    new THREE.PointLight(0xffffff, 4, 15),
                    new THREE.PointLight(0xff0000, 4, 15)
                  ],
                  [
                    new THREE.PointLight(0xffffff, 4, 15),
                    new THREE.PointLight(0xff0000, 4, 15)
                  ]
                ].reduce((acc, pointGlows, col) => ([...acc, ...pointGlows.map((pointGlow, row) => {
                  const len = pointGlows.length
                  const distanceRange = 4
                  const x = (col/len-.5)*distanceRange
                  const y = (row/len-.5)*distanceRange
                  pointGlow.position.set(x+1,y+4,0)
                  pointGlow.castShadow = false
                  return pointGlow
                })]), [])

                const spotLight = new THREE.SpotLight(0xffffff, 10, 20, Math.PI/3)
                spotLight.castShadow = true
                spotLight.position.set(-5, 5, 10)
                spotLight.target = cpu
                

                const allLights = [...topPointLights, ...centralPointLights, spotLight]
                return allLights.map(light => {
                  const shadowHelper = new THREE.CameraHelper(light.shadow.camera)
                  if(myObject.enableShadowHelpers) {
                    scene.add(shadowHelper)
                  }
                  return [light, shadowHelper]
                })
              }
             
              const addLightsToScene = (scene, lights, shadowHelpersEnabled) => {
                const cleanupFns = lights.map(([light, shadowHelper]) => {
                  // scene.add(light)
                  pcCase.add(light)
                  if(shadowHelpersEnabled){
                    scene.add(shadowHelper)
                  }
                  return () => {
                    pcCase.remove(light)
                    scene.remove(shadowHelper)
                  }
                })
                const cleanupFn = () => {
                  cleanupFns.forEach(fn => fn())
                }
                return cleanupFn
              }
              
             
              

             

              

              
              console.log('initialising keyboard listeners for transformControls')
              window.addEventListener( 'keydown', function ( event ) {

                switch ( event.keyCode ) {
      
                  case 81: // Q
                    transformControls.setSpace( transformControls.space === 'local' ? 'world' : 'local' );
                    break;
      
                  case 16: // Shift
                    transformControls.setTranslationSnap( 100 );
                    transformControls.setRotationSnap( THREE.MathUtils.degToRad( 15 ) );
                    transformControls.setScaleSnap( 0.25 );
                    break;
      
                  case 87: // W
                    transformControls.setMode( 'translate' );
                    break;
      
                  case 69: // E
                    transformControls.setMode( 'rotate' );
                    break;
      
                  case 82: // R
                    transformControls.setMode( 'scale' );
                    break;
      
                  // case 67: // C
                  //   const position = currentCamera.position.clone();
      
                  //   currentCamera = currentCamera.isPerspectiveCamera ? cameraOrtho : cameraPersp;
                  //   currentCamera.position.copy( position );
      
                  //   orbit.object = currentCamera;
                  //   transformControls.camera = currentCamera;
      
                  //   currentCamera.lookAt( orbit.target.x, orbit.target.y, orbit.target.z );
                  //   onWindowResize();
                  //   break;
      
                  // case 86: // V
                  //   const randomFoV = Math.random() + 0.1;
                  //   const randomZoom = Math.random() + 0.1;
      
                  //   cameraPersp.fov = randomFoV * 160;
                  //   // cameraOrtho.bottom = - randomFoV * 500;
                  //   // cameraOrtho.top = randomFoV * 500;
      
                  //   cameraPersp.zoom = randomZoom * 5;
                  //   // cameraOrtho.zoom = randomZoom * 5;
                  //   onWindowResize();
                  //   break;
      
                  case 187:
                  case 107: // +, =, num+
                    transformControls.setSize( transformControls.size + 0.1 );
                    break;
      
                  case 189:
                  case 109: // -, _, num-
                    transformControls.setSize( Math.max( transformControls.size - 0.1, 0.1 ) );
                    break;
      
                  case 88: // X
                    transformControls.showX = ! transformControls.showX;
                    break;
      
                  case 89: // Y
                    transformControls.showY = ! transformControls.showY;
                    break;
      
                  case 90: // Z
                    transformControls.showZ = ! transformControls.showZ;
                    break;
      
                  case 32: // Spacebar
                    transformControls.enabled = ! transformControls.enabled;
                    break;
      
                  case 27: // Esc
                    transformControls.reset();
                    break;
      
                }
      
              } );
      
              window.addEventListener( 'keyup', function ( event ) {
      
                switch ( event.keyCode ) {
      
                  case 16: // Shift
                    transformControls.setTranslationSnap( null );
                    transformControls.setRotationSnap( null );
                    transformControls.setScaleSnap( null );
                    break;
      
                }
      
              } );

              pcCase.rotation.y = Math.PI
              pcCase.position.y = -1.5
              pcCase.add(motherboard)
              motherboard.scale.set(motherboardScale, motherboardScale, motherboardScale)
              
              
              // chassis.scale.set(2,2,2)
              // chassis.rotation.z = -Math.PI/2
              // chassis.position.set(0,0,1.5)
              // motherboard.rotation.x = -Math.PI/2
              // motherboard.position.y = -1
              // pcCase.add(motherboard)
              motherboard.add(cpu)
              motherboard.add(cooler)
              // motherboard.add(ram)
              //motherboard.add(gpu)
              cpu.scale.set(0.43, 0.43, 0.43)
              cpu.rotation.set(Math.PI/2, 0, 0)
              cpu.position.set(0.59, 0.33, -2.15)
              // gui.add(myObject, "cpuY", 0.33, 0.99, 0.01).onChange(value => {
              //   cpu.position.setY(value)
              //   motherboard.position.setY(-(value-0.33)/12)
              // })
              cooler.scale.set(0.103, 0.103, 0.103)
              cooler.rotation.set(Math.PI/2, 0, 0)
              cooler.position.set(0.158, 0.675, 0.108)

              hdd.rotation.set(0, Math.PI/2, 0)
              const positionHdd = (x, y, z) => {
                hdd.position.set(x, y, z)
              }
              positionHdd(myObject.hddX, myObject.hddY, myObject.hddZ)

              // cooler.traverse(function (child) {
              //   console.log('child', child)
              //   if(child.material?.metalness) child.material.metalness *= 0.95;
              // })

              ram.scale.set(0.41, 0.41, 0.41)
              ram.rotation.set(Math.PI/2, Math.PI, 0)
              

              gpu.scale.set(1.45,1.45,1.45)
              gpu.rotation.set(0, Math.PI/2, Math.PI/2)
              gpu.position.set(gpuX,gpuY,gpuZ)
             
              const ramSticks = []
              const gpus = []

              const positionCpu = (x,y,z) => {
                cpu.position.set(x,y,z*0.9)
                cooler.position.set(
                  x,
                  y,
                  z*3
                )
              }
              
              const positionRamY = value => {
                ramSticks.forEach((ramStick, i) => {
                  ramStick.position.setY(value)
                  if(ramHighlight.current){
                    ramHighlight.current.children[i]?.position.setY(value)
                  }
                })
                
              }
              // positionRamY(myObject.ramY)
              const positionRamZ = (value) => {
                const t = ((value/(ramEnd-ramStart)-ramStart))*(1/(ramEnd-ramStart))
                // console.log('t', t)
                ramSticks.forEach((ramStick, index) => {
                  const z = value + (t*index*.2)
                  ramStick.position.setZ(z)
                  if(ramHighlight.current){
                    ramHighlight.current.children[index]?.position.setZ(z)
                  }
                })
              }
              // positionRamZ(ramStart)
              const ramGroup = new THREE.Group()
              const gpuGroup = new THREE.Group()
             
              const gpuA = gpu.clone()
              const gpuB = gpu.clone()
              scene.remove(gpu)
              gpuGroup.add(gpuA)
              gpuGroup.add(gpuB)
              gpuB.position.y = gpu.position.y-.8
              // gpuHighlight.current = initialiseHighlight(gpuGroup, 'gpu')
              gpus.push(gpuA, gpuB)
              const updateGpuVisibility = (nGpus) => {
                if(nGpus === 2){
                  gpus.forEach((gpu, index) => {
                    gpu.visible = true

                  })
                } else if(nGpus === 1){
                  gpus[1].visible = false
                  gpus[0].visible = true
                } else if(nGpus === 0){
                  gpus.forEach((gpu, index) => {
                    gpu.visible = false
                  })
                }
                gpuGroup.remove(gpuHighlight.current)
                gpuHighlight.current = initialiseHighlight(gpuGroup, 'gpu')
              }
              updateGpuVisibility(myObject.nGpus)
              const positionGpuX = value => {
                // gpus.forEach((gpu, i) => {
                //   gpu.position.setX(value)
                //   if(gpuHighlight.current){
                //     gpuHighlight.current.children[i]?.position.setX(value)
                //   }
                // })
              }
              console.log('gpuGroup', gpuGroup)
              console.log('ramGroup', ramGroup)
              const positionGpuZ = (value) => {
                const distance = 1
                const v = (gpuZ + value * distance)
                //const t = ((value/(gpuEnd-gpuStart)-gpuStart))*(1/(gpuEnd-gpuStart))
                // console.log('t', t)
                gpus.forEach((gpu, index) => {
                  const z = value + (v*(index+1)*.2)
                  gpu.position.setZ(z)
                  if(gpuHighlight.current){
                    gpuHighlight.current.children[index]?.position.setZ(z)
                  }
                })
              }
             
             /* const updateGpuVisibility = (nGpus, yOffset = 0, spread = -1.1) => {
                if(gpuHighlight.current) motherboard.remove(gpuHighlight.current)
                for (let i = 0; i < maxGpus; i++) {

                  gpuGroup.remove(gpus[i])
                  if (i < nGpus) {
                    gpus[i] = gpu.clone()
                    const gpuStick = gpus[i]
                    const y = (i/maxGpus)*spread+yOffset
                    gpuStick.position.setY(y)
                    console.log('gpuStick y', gpuStick.position, i)
                    // transformControls.attach(gpuStick);
                    gpuGroup.add(gpuStick)
                    if(gpuHighlight.current){
                      gpuHighlight.current.children[i]?.position.setY(y)
                    }
                  }
                }
                
                gpuHighlight.current = initialiseHighlight(gpuGroup, 'gpu')

                motherboard.add(gpuHighlight.current)
              }
              updateGpuVisibility(myObject.nGpus, myObject.gpuY)*/
              
              
             
              
              
              // gui.add(myObject, "explode", 0, 1, 0.01).onChange(value => {
              //   gpu.position.setY(value)
              //   //motherboard.position.setY(-(value - gpuY) / 12)
              // })
              console.log('translated, rotated, scaled models')
              

              
              const positionRamX = (nRamSticks, xOffset = 0) => {
                motherboard.remove(ramHighlight.current)
                for (let i = 0; i < maxRamSticks; i++) {

                  // scene.remove(ramSticks[i])
                  ramGroup.remove(ramSticks[i])
                  if (i < nRamSticks) {
                    ramSticks[i] = ram.clone()
                    const ramStick = ramSticks[i]
                    const x = (i/maxRamSticks)*0.56+xOffset
                    ramStick.position.setX(x)
                    // transformControls.attach(ramStick);
                    ramGroup.add(ramStick)
                    if(ramHighlight.current){
                      ramHighlight.current.children[i]?.position.setX(x)
                    }
                  }
                }
                
                ramHighlight.current = initialiseHighlight(ramGroup, 'ram')

                motherboard.add(ramHighlight.current)
              }
              positionRamX(myObject.nRamSticks, myObject.ramX)

              motherboard.add(ramGroup)
              motherboard.add(gpuGroup)
              
              gui.add(myObject, "nRamSticks", 0, maxRamSticks, 1).onChange(value => {
                positionRamX(value, myObject.ramX)
                positionRamY(myObject.ramY)
                positionRamZ(myObject.ramZ)
              })
              gui.add(myObject, "nGpus", 0, maxGpus, 1).onChange(value => {
                positionGpuX(myObject.ramX)
                updateGpuVisibility(value)
                positionGpuZ(myObject.ramZ)
              })
              
              gui.add(myObject, "explodeFn")
              console.log('creating point lights...')
              const lights = createLights()
              console.log('adding lights to scene')
              let lightsDispose = addLightsToScene(scene, lights, myObject.enableShadowHelpers)
              
              let selectablePointGrid = {
                points: null,
                pointer: null,
                unregisterPointerListener: null,
                POINT_SIZE,
                prevIntersected: { index: null },
                enabled: false
              }

              const [rc, ptr, upl] = setupRaycasterAndPointer()
              const raycaster = rc
              const pointer = ptr
              // gui.add(selectablePointGrid, 'enabled')
              // .name('Enable point grid')
              // .onChange(value => {
              //   if(value){
              //     selectablePointGrid.points = createPoints()
              //     scene.add(selectablePointGrid.points)
  
                  
              //     selectablePointGrid.pointer = ptr
              //     selectablePointGrid.unregisterPointerListener = upl
              //   } else {
              //     if(selectablePointGrid.points){
              //       scene.remove(selectablePointGrid.points)
              //       selectablePointGrid.pointer = null
              //       selectablePointGrid.unregisterPointerListener()
              //     }
              //   }
              // })
              
              
              gui.add(myObject, "enableShadowHelpers").onChange(enabled => {
                if(lightsDispose){
                  lightsDispose()
                }
                lightsDispose = addLightsToScene(scene, lights, enabled)
                scene.remove(directionalShadowHelper)
                if(enabled){
                  scene.add(directionalShadowHelper)
                }
              })
              if(!myObject.enableShadowHelpers){
                scene.remove(directionalShadowHelper)
              }
              
              motherboard.position.set(motherboardX, motherboardY, motherboardZ)

              // gui.add(myObject, "motherboardX", -3+motherboardX, 3+motherboardX, 0.001).onChange(value => {
              //   motherboard.position.setX(value)
              // })
              // gui.add(myObject, "motherboardY", -3+motherboardY, 3+motherboardY, 0.001).onChange(value => {
              //   motherboard.position.setY(value)
              // })
              
              positionCpu(myObject.cpuX, myObject.cpuY, myObject.cpuZ)

              const cameraPath = [
                new THREE.Vector3(-5, -1, 1),
                new THREE.Vector3(-4.38, .63, -5.62),
                new THREE.Vector3(-1.85, -1.87, -8.76),
                new THREE.Vector3(-0.64, 1.86, -6.24),
                new THREE.Vector3(1.26, 3.75, -5.624),
              ]

              const { x: camX, y:camY, z: camZ } = cameraPath[0]
              camera.position.set(camX, camY, camZ );

              console.log('camera pos', camera.position)
              const camCurve = new THREE.CatmullRomCurve3(cameraPath)
              camCurve.curveType = "centripetal"
              camCurve.closed = false
              const camCurvePoints = camCurve.getPoints(200 * cameraPath.length)
              // const camCurveGeometry = new THREE.BufferGeometry().setFromPoints(camCurvePoints)
              // const camCurveMaterial = new THREE.LineBasicMaterial({
              //   color: 0xffbb00
              // })

              // const camCurveMesh = new THREE.Line(camCurveGeometry, camCurveMaterial)
              // scene.add(camCurveMesh)


              const clock = new THREE.Clock()

              const cameraPosition = new THREE.Vector3()

              const camCurveFraction = { value: 0 }

              console.log(camCurvePoints)

              // orbitControls.target = cpu.position

              const cpuPos = new THREE.Vector3()

              // motherboard.name = 'motherboard'
              // cpu.name = 'cpu'
              // cooler.name = 'cooler'
              // gpu.name = 'gpu'
              // ramSticks.forEach(ram => {
              //   ram.name = 'ram'
              // })
              // motherboardGroup.userData = {
              //   mesh: null,
              //   scale: new THREE.Vector3(motherboard.scale),
              //   prevIntersected: {
              //     colour: 0,
              //     metalness: 1
              //   }
              // }
              const intersectingParts = []

              const intersectComputerModule = (group, partName = 'Computer', {setChildFn, unsetChildFn, setFn, unsetFn}) => {
                console.log('partName', partName, !!group)
                const intersects = raycaster.intersectObject(group)?.[0]
                if(intersects){
                  if(setFn) setFn(group)
                  if(setChildFn){
                    group.traverse(child => {
                      if(child.isMesh && child.userData['is'+partName+'Part']){
                        setChildFn(child)
                      }
                    })
                  }
                } else {
                  if(unsetFn) unsetFn(group)
                  if(unsetChildFn){
                    group.traverse(child => {
                      if(child.isMesh && child.userData['is'+partName+'Part']){
                        unsetChildFn(child)
                      }
                    })
                  }
                }
                return intersects
              }
              
              const processIntersects = ({intersectsSideGlassPane, intersectsCpu, intersectsMotherboard, intersectsRam, intersectsGpu, intersectsCooler, intersectsHdd, intersectsPsu}, processFn) => {
                const intersects = [
                  ['sideGlassPane', intersectsSideGlassPane, sideGlassPaneHighlight],
                  ['cpu', intersectsCpu, cpuHighlight],
                  ['motherboard', intersectsMotherboard, motherboardHighlight],
                  ['ram', intersectsRam, ramHighlight.current],
                  ['gpu', intersectsGpu, gpuHighlight.current],
                  ['cooler', intersectsCooler, coolerHighlight],
                  ['hdd', intersectsHdd, hddHighlight],
                  ['psu', intersectsPsu, psuHighlight]
                ]
                  const closestIntersection = intersects.reduce(([accIndex, accDist], [partName, intersection], index) => {
                    if(intersection?.distance < accDist){
                      return [index, intersection.distance]
                    }
                    return [accIndex, accDist]
                  }, [-1, Infinity])

                  const [closestIntersectionIndex] = closestIntersection
                  intersects.forEach(([name, intersection, mesh], index) => {
                    processFn(name, intersection, mesh, index === closestIntersectionIndex)
                  })
                  return intersects.some(([name, intersect]) => !!intersect)
              }

              const flowSpeed = {
                value: 0.0015
              }

              gui.add(flowSpeed, 'value', 0.0015, 0.015, 0.0001).name('Camera flow speed')
              
              return {
                // world,
                // rigidBody,
                // sampleMesh,
                intersectingParts,
                intersectComputerModule,
                sideGlassPane,
                sideGlassPaneHighlight,
                motherboard,
                motherboardHighlight,
                cpuHighlight,
                coolerHighlight,
                // motherboardGroup,
                // processMotherboard,
                cpu,
                shaderMaterial,
                orbitControls,
                camera,
                scene,
                selectablePointGrid,
                raycaster,
                pointer,
                cameraPath,
                clock,
                cameraPosition,
                // camCurveGeometry,
                camCurveFraction,
                camCurvePoints,
                camCurve,
                cpuPos,
                myObject,
                renderer,
                hddHighlight,
                psuHighlight,
                processIntersects,
                flowSpeed
              }
            },
            onResize: (width, height, { shaderMaterial }) => {
              if (shaderMaterial) {
                shaderMaterial.uniforms.iResolution.value.set(width, height);
                [...document.querySelectorAll('.GlslEditor textarea')].forEach((el: HTMLTextAreaElement) => {
                  el.style.width = width + 'px'
                })
              }
            },
            onDrag: (e, dist) => {
              dragDist.current = dist
            },
            onClick: (e, {
              camera,
              scene,
              selectablePointGrid,
              sideGlassPane,
              sideGlassPaneHighlight,
              raycaster,
              pointer,
              myObject,
              motherboardHighlight,
              cpuHighlight,
              coolerHighlight,
              hddHighlight,
              processIntersects,
              psuHighlight
            }) => {
              if(dragDist.current > 10) return
              if(selectablePointGrid.enabled){
                const { points, prevIntersected } = selectablePointGrid
                raycaster.setFromCamera(pointer, camera)
                raycaster.params.Points.threshold = 0.05;
                const pointsAttrs = points.geometry.attributes
                // intersect points
                const intersects = raycaster.intersectObject(points)?.[0]
                if(prevIntersected.index !== null){
                  pointsAttrs.size.array[prevIntersected.index] = selectablePointGrid.POINT_SIZE
                  pointsAttrs.size.needsUpdate = true
                  prevIntersected.index = null
                }
                if(intersects) {
                    // intersects[ i ].object.material.color.set( 0xff0000 );
                    prevIntersected.index = intersects.index
                    pointsAttrs.size.array[prevIntersected.index] = selectablePointGrid.POINT_SIZE * 3
                    pointsAttrs.size.needsUpdate = true
                    
                    const intersectPosition = intersects.point
                    console.log('intersects', intersectPosition)
                }
              }

              // intersect sideGlassPane
              const intersectsSideGlassPane = raycaster.intersectObject(sideGlassPaneHighlight)?.[0]
              const intersectsCpu = raycaster.intersectObject(cpuHighlight)?.[0]
              const intersectsMotherboard = raycaster.intersectObject(motherboardHighlight)?.[0]
              const intersectsCooler = raycaster.intersectObject(coolerHighlight)?.[0]
              let intersectsRam
              if(ramHighlight.current){
                intersectsRam = raycaster.intersectObject(ramHighlight.current)?.[0]
              }
              let intersectsGpu
              if(gpuHighlight.current){
                intersectsGpu = raycaster.intersectObject(gpuHighlight.current)?.[0]
              }
              const intersectsHdd = raycaster.intersectObject(hddHighlight)?.[0]
              const intersectsPsu = raycaster.intersectObject(psuHighlight)?.[0]
              processIntersects(
                {intersectsSideGlassPane, intersectsCpu, intersectsMotherboard, intersectsRam, intersectsGpu, intersectsCooler, intersectsHdd, intersectsPsu},
                (partName, intersection, mesh, isClosest) => {
                  console.log('part', partName, 'is closest', isClosest)
                  mesh.visible = false
                  if(intersection && isClosest){
                    mesh.visible = true
                    switch(partName){
                      case 'sideGlassPane':{
                        myObject.explodeFn()
                        break;
                      }
                      default:
                        showPopup(partName)
                        break;
                    }
                  }
                }
              )
              
            },
            onLoop: ({ time, frame }, {
              world,
              rigidBody,
              sampleMesh,
              shaderMaterial,
              orbitControls,
              camera,
              scene,
              selectablePointGrid,
              clock,
              sideGlassPane,
              cpu,
              motherboard,
              motherboardHighlight,
              cpuHighlight,
              coolerHighlight,
              // motherboardGroup,
              // processMotherboard,
              cameraPosition,
              // camCurveGeometry,
              camCurveFraction,
              camCurvePoints,
              camCurve,
              cpuPos,
              myObject,
              raycaster,
              pointer,
              renderer,
              intersectingParts,
              intersectComputerModule,
              hddHighlight,
              psuHighlight,
              processIntersects,
              flowSpeed
             }) => {
             
              // a bit hacky but works
              let loaded = frame === 2
              // console.log('frame', frame)
              if(frame <= 2 ) {
                if(frame === 1){
                  totalLoadedPercent.current = 95
                  console.log('loaded', totalLoadedPercent.current+'%')
                  onProgress(totalLoadedPercent.current)
                }
                
              }
              
              
              onLoopFn.current()
              
              // const resetMotherboardMaterial = processMotherboard(mesh => {
              //   const original = {
              //     colour: new THREE.Color(mesh.material.color),
              //     metalness: mesh.material.metalness
              //   }
              //   mesh.material.color.set(0xffffff)
              //   mesh.material.metalness *= 0.9
              //   return () => {
              //     mesh.material.color.set(original.colour)
              //     mesh.material.metalness = original.metalness
              //   }
              // })
                
              if(raycaster && pointer && renderer){
                raycaster.setFromCamera(pointer, camera)
                // const closest
                //  let intersectsSideGlassPane = raycaster.intersectObject(sideGlassPane)?.[0]




                // // getIntersections('sideGlassPane', intersectsSideGlassPane)
                // const prevIntersectedSideGlassPane = sideGlassPane.userData.prevIntersected
                // if(!intersectsSideGlassPane && prevIntersectedSideGlassPane.mesh !== null){
                //   sideGlassPane.material.color.set(prevIntersectedSideGlassPane.colour)
                //   sideGlassPane.material.needsUpdate = true
                //   // pointsAttrs.size.array[prevIntersected.index] = selectablePointGrid.POINT_SIZE
                //   // pointsAttrs.size.needsUpdate = true
                //   // prevIntersected.index = null
                //   prevIntersectedSideGlassPane.mesh = null
                //   renderer.domElement.style.cursor = ''
                // }
                // if(intersectsSideGlassPane) {
                //   intersectingParts.push(sideGlassPane)
                //   sideGlassPane.userData.mesh = sideGlassPane
                //   prevIntersectedSideGlassPane.mesh = sideGlassPane
                //   sideGlassPane.material.color.set(0xddff99)
                //   sideGlassPane.material.needsUpdate = true
                //   renderer.domElement.style.cursor = 'pointer'
                //     // intersects[ i ].object.material.color.set( 0xff0000 );
                //     // prevIntersected.index = intersects.index
                //     // pointsAttrs.size.array[prevIntersected.index] = selectablePointGrid.POINT_SIZE * 3
                //     // pointsAttrs.size.needsUpdate = true
                    
                //     // const intersectPosition = intersects.point
                // }
                  
                  const setIntersectedObject = object => {
                    renderer.domElement.style.cursor = 'pointer'
                    // object.visible = true
                  }
                  const unsetIntersectedObject = object => {
                    renderer.domElement.style.cursor = ''
                    // object.visible = false
                  }
                  const intersectsSideGlassPane = intersectComputerModule(sideGlassPane, 'SideGlassPane', {
                  })
                  const intersectsCpu = intersectComputerModule(cpuHighlight, 'Cpu', {
                  })
                  const intersectsMotherboard = intersectComputerModule(motherboardHighlight, 'Motherboard', {
                    // setChildFn: null,
                    // unsetChildFn: null,
                    // setFn:setIntersectedObject,
                    // unsetFn: unsetIntersectedObject
                  })
                  const intersectsCooler = intersectComputerModule(coolerHighlight, 'Cooler', {})
                  let intersectsRam = intersectComputerModule(ramHighlight.current, 'Ram', {
                  })
                  let intersectsGpu = intersectComputerModule(gpuHighlight.current, 'Gpu', {})
                  const intersectsHdd = intersectComputerModule(hddHighlight, 'Hdd', {})
                  const intersectsPsu = intersectComputerModule(psuHighlight, 'Psu', {})
                  const intersectsAtAll = processIntersects(
                    {intersectsSideGlassPane, intersectsCpu, intersectsMotherboard, intersectsRam, intersectsGpu, intersectsCooler, intersectsHdd, intersectsPsu},
                    (partName, intersection, mesh, isClosest) => {
                      mesh.visible = false
                      if(intersection && isClosest){
                        mesh.visible = true
                      }
                    }
                  )
                  // const intersectsScene = raycaster.intersectObject(scene)?.[0]
                  // console.log('intersectsScene', intersectsScene)
                  if(intersectsAtAll){
                    renderer.domElement.style.cursor = 'pointer'
                  } else {
                    renderer.domElement.style.cursor = ''
                  }
                }
              
              if(camCurveFraction.value < 1){
                // console.log('camCurvePoints', camCurvePoints)
                // const newPosition = camCurve.getPoint(camCurveFraction.value)
                const camCurvePointIndex = Math.floor(easeInOutCubic(camCurveFraction.value)*camCurvePoints.length)
                const { x: camX, y: camY, z: camZ} = camCurvePoints[camCurvePointIndex]
                camera.position.set(camX, camY, camZ)
                cpu.localToWorld(orbitControls.target.set(0,0,0))
                //orbitControls.target.set(targetX, targetY, targetZ)
                //camera.lookAt(motherboard.position)
                // 
                
                //orbitControls.enabled = false
                // orbitControls.enabled = false
                //orbitControls.target.copy(motherboard.position)
                // motherboard.localToWorld(orbitControls.target.set(camX,camY,camZ))
              }
              // if(camCurveFraction.value >= 1 && camCurveFraction.value < 2){
              //   // cpu.updateMatrix();
              //   orbitControls.target.copy( cpu.position )
              //   orbitControls.update()
              //   orbitControls.enabled = true
              //   // trigger explode at some point
              //   // camera.lookAt(cpu.position)
              // }
              const startExplodeFrame = 10
              // const endExplodeFrame = startExplodeFrame + 300 + 100
              if(frame === startExplodeFrame /*|| frame === endExplodeFrame*/){
                myObject.explodeFn()
              }
              
              if(Math.abs(camCurveFraction.value-1) <= flowSpeed.value){
                cpu.localToWorld(orbitControls.target.set(0,0,0))
                orbitControls.enabled = true
                console.log('orbi controls enabled')
              }
              camCurveFraction.value += flowSpeed.value
              orbitControls.update();
              

              // camera.position.set(flow.position)
              // motherboard.updateMatrix();
              // 
              // 
              
              
              // world.step()
              // // copy over the position from Rapier to Three.js
              // const rigidBodyPosition = rigidBody.translation()
              // sampleMesh.position.set(
              //   rigidBodyPosition.x,
              //   rigidBodyPosition.y,
              //   rigidBodyPosition.z)
              // // copy over the rotation from Rapier to Three.js
              // const rigidBodyRotation = rigidBody.rotation()
              // sampleMesh.rotation.setFromQuaternion(
              //   new THREE.Quaternion(rigidBodyRotation.x, rigidBodyRotation.y, rigidBodyRotation.z, rigidBodyRotation.w)
              // )
              if (shaderMaterial) {
                // shaderMesh.rotation.x = time;
                // plane.rotation.y = time/2;
                // plane.rotation.x = time/3;
                shaderMaterial.uniforms.iTime.value = time;
              }
              if(loaded){
                totalLoadedPercent.current = 100
                console.log('loaded', totalLoadedPercent.current+'%')
                onProgress(totalLoadedPercent.current)
                return { status: 'loaded' }
              }
            },
            onAllLoaded: allLoaded => {
              console.log('loaded everything?', allLoaded)
            }
          }
        )
        setThreeApp(threeApp)
        const { renderer, scene, camera, cleanup } = threeApp
        cleanupFn.current = cleanup
        renderer.autoClear = false


        /*const createCanvasTexture = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 16;
          canvas.height = 16;
          
          const ctx = canvas.getContext('2d');
          // the body
          ctx.translate(8, 8);
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
          gradient.addColorStop(0, '#ffffff')
          gradient.addColorStop(0.25, '#c9c9c9')
          gradient.addColorStop(0.5, '#a8a8a8')
          gradient.addColorStop(0.75, '#666666')
          gradient.addColorStop(1, '#000000')
          ctx.fillStyle = gradient
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2, false);
          ctx.closePath();
          ctx.fill();
      
      
          var texture = new THREE.Texture(canvas);
          texture.needsUpdate = true;
          return texture;
      };*/


        // if (scene.getObjectByName("points")) {
        //   scene.remove(scene.getObjectByName("points"));
        // }


        return () => {
          cleanup()

          // pointCloud.geometry.dispose();
          // pointCloud.material.dispose();
          // scene.remove(pointCloud)
        }
      }
      init()
    }

  }, [compileNumber, enableShader, gui])
  return cleanupFn
}

export default useThree
