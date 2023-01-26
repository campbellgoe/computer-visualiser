import * as THREE from "three";
import { scrollbarWidthPx } from "../../../utils/padding.globals";


// creates a canvas element using three.js and renders a shader on a rotating plane
async function initialiseScene(
  shaderMaterialOptions,
  {
    useFocalLength = false,
    onInit = (inputData) => null,
    onClick = (e: Event, initData) => null,
    onDrag = null,//(e: Event, dragDist: number, initData) => null,
    onLoop = (loopData, initData) => null,
    onResize = (width: number, height: number, initData) => null,
    onAllLoaded = (loaded: boolean | any | undefined) => null,
  } = {}
) {
  
  
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    (window.innerWidth-scrollbarWidthPx) / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const initData = await onInit({scene, camera, renderer, shaderMaterialOptions, useFocalLength, });

  // suppose you want to make it smaller?
  // camera.position.z *= 2;
  let time = 0;
  let frame = 0
  // let paused = false;
  const render = () => {
    requestAnimationFrame(render);
    // if (!paused) {
      time += 0.01;
      frame ++
      const loopRes = onLoop({ time, frame }, initData);
      
      const allLoaded = typeof loopRes == 'object' && loopRes.status === 'loaded'
    // }
    renderer.render(scene, camera);
    if(allLoaded){
      onAllLoaded(allLoaded)
    }
  };
  render();
  const resize = () => {
    const width = window.innerWidth - scrollbarWidthPx
    const height = window.innerHeight
    const aspectRatio = width / height
    camera.aspect = aspectRatio
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth - scrollbarWidthPx, window.innerHeight);
    onResize(
      window.innerWidth - scrollbarWidthPx,
      window.innerHeight,
      initData
    );

    // TODO: debounce and also resize window correctly
  };
  resize();
  const handleClickScreen = (e) => {
    // paused = !paused;
    onClick(e, initData);
  };
  window.addEventListener("resize", resize, false);
  renderer.domElement.addEventListener("click", handleClickScreen, false);
  const downPos = {
    x: 0,
    y: 0
  }
  const dragPos = {
    x: 0,
    y: 0,
  }
  const handleDown = e => {
    let x = 0
    let y = 0
    if(e.touches){
      x = e.touches[0].clientX
      y = e.touches[0].clientY
    } else {
      x = e.clientX
      y = e.clientY
    }
    downPos.x = x
    downPos.y = y
    dragPos.x = x
    dragPos.y = y
    onDrag(e, 0, initData)
  }
  const handleDrag = e => {
    let x = 0
    let y = 0
    if(e.changedTouches){
      x = e.changedTouches[0].clientX
      y = e.changedTouches[0].clientY
    } else {
      x = e.clientX
      y = e.clientY
    }
    dragPos.x = x
    dragPos.y = y
    const dragDist = Math.sqrt((dragPos.x-downPos.x)**2 + (dragPos.y-downPos.y)**2)
    onDrag(e, dragDist, initData)
  }
  if(onDrag){
    renderer.domElement.addEventListener("mousedown", handleDown, false)
    renderer.domElement.addEventListener("mousemove", handleDrag, false)
    renderer.domElement.addEventListener("touchstart", handleDown, false)
    renderer.domElement.addEventListener("touchmove", handleDrag, false)
  }
  return {
    renderer,
    scene,
    camera,
    cleanup: () => {
      renderer.domElement.remove();
      window.removeEventListener("resize", resize, false);
      renderer.domElement.removeEventListener(
        "click",
        handleClickScreen,
        false
      );
      if(onDrag){
        renderer.domElement.removeEventListener("mousedown", handleDown, false)
        renderer.domElement.removeEventListener("mousemove", handleDrag, false)
        renderer.domElement.removeEventListener("touchstart", handleDown, false)
        renderer.domElement.removeEventListener("touchmove", handleDrag, false)
      }
    },
  };
}

export default initialiseScene;
