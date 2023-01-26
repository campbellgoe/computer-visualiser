import { useCallback } from "react";
import styled from "styled-components";

const GlslEditor = styled(({ className = '', glsl, onChange }) => {
  return (
    <div className={className + ' GlslEditor'}>
      <textarea value={glsl} onChange={onChange} />
    </div>
  );
})`
textarea {
  width: 100%;
  height: 50ch;
}
`
const GlslEditorContainer = ({ className = '', glsl, setGLSL }) => {
  const handleChangeGLSL = useCallback(event => {
    setGLSL(event.target.value);
  }, [])
  return (
    <GlslEditor className={className + ' GlslEditorContainer'} glsl={glsl} onChange={handleChangeGLSL} />
  );
};

export default GlslEditorContainer