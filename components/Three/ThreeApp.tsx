import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import GlslEditorContainer from './GlslEditor/GlslEditor';
import { fragmentShaderMain } from './Main/shaderParts';
import useComputerVisualiserApp from './Main/useComputerVisualiserApp';
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import Fuse from 'fuse.js'
import styled from 'styled-components';
import GUI from "lil-gui";

const regexToSplitCapitalisedWords = /[A-Z][a-z]+|[0-9]+/g

const ThreeSearch = ({ className = '', splitKeysBySpace = false }) => {
  const ThreeKeys: string[] = useMemo(() => ([...new Set(Object.keys(THREE).filter(Key => typeof Key == 'string' && Key.length > 0).map(Key => {
    return Key.match(regexToSplitCapitalisedWords)?.join(" ") || ''
  }).filter(Key => typeof Key == 'string' && Key.length > 0))]), [THREE])

  const ThreeKeysCategories: string[] = useMemo(() => {
    const categories = [... new Set(ThreeKeys.reduce((acc, Key) => ([...acc, ...Key.split(' ')]), []))]
    return categories
  }, [ThreeKeys])
  const SearchKeys = useMemo(() => (splitKeysBySpace ? [...new Set([...ThreeKeys, ...ThreeKeysCategories])] : ThreeKeys).map(Key => Key.split(' ').join('')), [ThreeKeys, ThreeKeysCategories, splitKeysBySpace])
  const fuseStore = useRef(SearchKeys)
  const fuse = useRef(new Fuse(fuseStore.current, {
    keys: ['Key']
  }))
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<{ item: string }[]>([])


  useEffect(() => {
    if(fuse.current){
      setSearchResults(() => fuse.current.search(searchTerm))
    }
  }, [searchTerm])
  return (
    <div className={className + ' ThreeSearch'}>
      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      Found {searchResults.length} results.
      {searchResults.map(({ item: Key }) => {
        return (
          <li key={Key}>
            <a
              href={'https://threejs.org/docs/?q='+Key}
              target="_blank"
            >
              {Key.split(' ').join('')}
            </a>
          </li>
        )
      })}
    </div>
  )
}
const GenericPopup = styled(({ className = '', modelName = 'generic module', onClose, title = 'Computer part', children }) => {
  return (
    <div className={className}>
      <div className="close-btn" onClick={onClose}><img src="/icons/close.svg"/></div>
      <h1>{title}</h1>
      <h3>{modelName}</h3>
      <pre>{children}</pre>
    </div>
  )
})`
position: fixed;
width: 300px;
min-height: 250px;
background: rgba(255,255,255,0.72);
backdrop-filter: blur(3px);
border: 1px solid black;
border-radius: 4px;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
padding: 1rem 0.5rem;
.close-btn {
  position: absolute;
  top: .25rem;
  right: .25rem;
  cursor: pointer;
  padding: 5px;
  img {
    width: 32px;
    height: 32px;
  }
}
`

const ThreeApp = ({ className = '', }) => {
  const [glsl, setGLSL] = useState(fragmentShaderMain)
  const [progress, setProgress] = useState(0)
  const [enableShader, setEnableShader] = useState(false)
  const [threeApp, setThreeApp] = useState(null)
  const handleExportScene = useCallback(() => {
    if(threeApp){
      const save = (blob, filename) => {
        const link = document.createElement('a')
        link.style.display = 'none'
        document.body.appendChild(link)
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
      }
      
      const { scene } = threeApp
      const exporter = new GLTFExporter()
      const options = {
        trs: false,
        onlyVisible: true,
        binary: false
      }
      exporter.parse(
        scene,
        (result) => {
          const output = JSON.stringify(result, null, 2)
          save(new Blob([output], { type: 'text/plain' }), 'out.gltf')
        },
        (error) => {
          console.log('An error happened during parsing of the scene', error)
        },
        options
      )
    }
  }, [threeApp])

  const [popup, setPopup] = useState('')
  const popupsData = {
    motherboard: (
    <GenericPopup
      className="MotherboardPopup"
      modelName="ROG STRIX"
      title="Motherboard"
      onClose={() => {
        setPopup('')
      }}
    >
      {`The motherboard is what connects all the components of the computer together.`}
      </GenericPopup>
    ),
    cpu: (
      <GenericPopup
        className="CpuPopup"
        modelName="AMD Sempron"
        title="Central Processing Unit (CPU)"
        onClose={() => {
          setPopup('')
        }}
      >
        {`The CPU executes instructions to run programs on the computer.`}
      </GenericPopup>
    ),
    ram: (
      <GenericPopup
        className="RamPopup"
        modelName=""
        title="Random Access Memory (RAM)"
        onClose={() => {
          setPopup('')
        }}
      >
        {`RAM stores programs and their state for faster run-time speed, but RAM memory is not persistent, requiring continuous power.`}
      </GenericPopup>
    ),
    gpu: (
      <GenericPopup
        className="GpuPopup"
        modelName="Geforce RTC 2080Ti"
        title="Graphics Processing Unit (GPU)"
        onClose={() => {
          setPopup('')
        }}
      >
        {`The GPU can perform multiple calculations at the same time, making it useful for image and graphics rendering.`}
      </GenericPopup>
    ),
    cooler: (
      <GenericPopup
        className="CoolerPopup"
        modelName="CPU COOL"
        title="CPU Cooler"
        onClose={() => {
          setPopup('')
        }}
      >
        {`The CPU Cooler, with a heatsink and fan uses air cooling to keep the CPU from getting too hot. An alternative is a water cooled CPU.`}
      </GenericPopup>
    ),
    hdd: (
      <GenericPopup
        className="HddPopup"
        modelName="Hard-Disc Drive (HDD) / Solid-State Drive (SSD)"
        title=""
        onClose={() => {
          setPopup('')
        }}
      >
        {`The HDD/SSD stores data persistently but is slower to access than data stored in RAM.`}
      </GenericPopup>
    ),
    psu: (
      <GenericPopup
        className="PsuPopup"
        modelName=""
        title="Power Supply Unit (PSU)"
        onClose={() => {
          setPopup('')
        }}
      >
        {`The PSU provides power to all the components of the computer.`}
      </GenericPopup>
    ),
    '': null
  }
  const popupJsx = popupsData[popup]
  const [gui, setGui] = useState(null)
  const cleanup = useComputerVisualiserApp({
    gui,
    enableShader,
    glsl,
    setThreeApp,
    onProgress: progress => {
      setProgress(progress)
    },
    showPopup: partName => {
      setPopup(partName)
    },
  })
  
  useEffect(() => {
    const gui = new GUI();
    setGui(gui)
    return () => {
      gui.destroy()
      cleanup.current()
    }
  }, [cleanup])
  const loadingBarHeight = '100vh'
  const loadingBarColour = 'black'
  useEffect(() => {
    if(progress > 50){
      document.documentElement.scrollBy(0, 12)
    }
  }, [progress])
  return <div className={className + ' ThreeApp'}>
    
    {/* <button
      onClick={
        () => setEnableShader(enabled => !enabled)
      }
    >
      Toggle shader {enableShader ? 'off' : 'on'}
    </button> */}
    {/* {enableShader && <GlslEditorContainer glsl={glsl} setGLSL={setGLSL} />} */}
    <ThreeSearch />
    <button onClick={handleExportScene}>Export scene to .gltf</button>
    {progress < 100 && <p>Loading {progress.toFixed(2)}%</p>}
    {progress < 100 && <div style={{
      minWidth: '0',
      minHeight: loadingBarHeight,
      maxWidth: '100vw',
      maxHeight: loadingBarHeight,
      height: loadingBarHeight,
      width: progress+'%',
      background: loadingBarColour,
    }}/>}
    {popupJsx}
  </div>
}

export default ThreeApp