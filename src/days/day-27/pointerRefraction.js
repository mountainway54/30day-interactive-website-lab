import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// A short, bounded trail of damped wavefronts displaces the actual scene image.
export function createPointerRefraction(renderer, scene, camera, redraw) {
  const composer = new EffectComposer(renderer)
  const scenePass = new RenderPass(scene, camera)
  const waves = Array.from({ length: 8 }, () => new THREE.Vector4(.5, .5, -10, 0))
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uWaves: { value: waves }, uTime: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse;
      uniform vec4 uWaves[8];
      uniform float uTime;
      uniform float uAspect;
      varying vec2 vUv;
      void main(){
        vec2 displacement=vec2(0.0);
        for(int i=0;i<8;i++){
          float age=uTime-uWaves[i].z;
          if(age>=0.0 && age<0.9){
            vec2 delta=(vUv-uWaves[i].xy)*vec2(uAspect,1.0);
            float distanceToWave=length(delta);
            float radius=.02+age*.128;
            float envelope=exp(-pow((distanceToWave-radius)/.06,2.0));
            float decay=pow(1.0-age/0.9,2.0);
            float ripple=sin(distanceToWave*65.0-age*9.0);
            displacement+=delta/max(distanceToWave,.001)*envelope*decay*ripple*uWaves[i].w*.012;
          }
        }
        displacement=clamp(displacement,vec2(-.035),vec2(.035))/vec2(uAspect,1.0);
        vec2 uv=clamp(vUv+displacement,vec2(.001),vec2(.999));
        vec4 green=texture2D(tDiffuse,uv);
        vec4 red=texture2D(tDiffuse,clamp(uv+displacement*.24,vec2(.001),vec2(.999)));
        vec4 blue=texture2D(tDiffuse,clamp(uv-displacement*.24,vec2(.001),vec2(.999)));
        float alpha=max(green.a,max(red.a,blue.a));
        gl_FragColor=vec4(red.r,green.g,blue.b,alpha);
      }`
  })
  // ShaderPass clones uniforms; bind the live trail updated by pointer events.
  pass.uniforms.uWaves.value = waves
  const output = new OutputPass()
  composer.addPass(scenePass); composer.addPass(pass); composer.addPass(output)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let frame=0, index=0, lastEmission=-10, lastX=null, lastY=null, activeUntil=0, disposed=false
  function tick(){
    frame=0
    if(disposed || document.hidden || reduced.matches)return
    redraw()
    if(performance.now()/1000<activeUntil)frame=requestAnimationFrame(tick)
  }
  function move(event){
    if(disposed || document.hidden || reduced.matches || event.pointerType==='touch')return
    const bounds=renderer.domElement.getBoundingClientRect()
    if(!bounds.width || !bounds.height)return
    const x=(event.clientX-bounds.left)/bounds.width, y=1-(event.clientY-bounds.top)/bounds.height
    if(x<0 || x>1 || y<0 || y>1)return
    const now=performance.now()/1000
    if(lastX===null){lastX=x;lastY=y;return}
    const distance=Math.hypot((x-lastX)*bounds.width,(y-lastY)*bounds.height)
    if(now-lastEmission<.045 || distance<2)return
    waves[index].set(x,y,now,Math.min(1,distance/45+.2))
    index=(index+1)%waves.length;lastX=x;lastY=y;lastEmission=now;activeUntil=now+0.9
    if(!frame)frame=requestAnimationFrame(tick)
  }
  function reset(){
    cancelAnimationFrame(frame);frame=0;lastX=null;lastY=null;activeUntil=0
    waves.forEach(w=>w.z=-10)
    if(!disposed && !document.hidden)redraw()
  }
  window.addEventListener('pointermove',move,{passive:true})
  window.addEventListener('blur',reset)
  document.addEventListener('visibilitychange',reset)
  reduced.addEventListener('change',reset)
  return {
    render(){pass.uniforms.uTime.value=performance.now()/1000;composer.render()},
    resize(width,height){pass.uniforms.uAspect.value=width/Math.max(height,1);composer.setSize(width,height)},
    dispose(){disposed=true;cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',reset);reduced.removeEventListener('change',reset);scenePass.dispose();pass.dispose();output.dispose();composer.dispose()}
  }
}
