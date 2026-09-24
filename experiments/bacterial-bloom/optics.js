
/* Optical transfer only: no writes to the simulation or the poem's sampled field. */
window.BloomOptics=(()=>{
 let mode='fluorescence',exposure=1.2,image=null;
 const size=256;
 const sample=(f,x,y,w,h)=>{
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const x0=(ix+w)%w,x1=(ix+1+w)%w,y0=(iy+h)%h,y1=(iy+1+h)%h;
  return (f[y0*w+x0]*(1-fx)+f[y0*w+x1]*fx)*(1-fy)+(f[y1*w+x0]*(1-fx)+f[y1*w+x1]*fx)*fy;
 };
 function draw(ctx,field,w,h,soft){
  if(!field)return;
  if(ctx.canvas.width!==size||ctx.canvas.height!==size){ctx.canvas.width=size;ctx.canvas.height=size;image=null;}
  if(!image)image=ctx.createImageData(size,size);
  const pixels=image.data,F=mode==='soft'&&soft?soft:field;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const sx=(x+.5)*w/size-.5,sy=(y+.5)*h/size-.5;
   const values=[sample(F.R,sx,sy,w,h),sample(F.G,sx,sy,w,h),sample(F.B,sx,sy,w,h)];
   let rgb=[5,10,20];
   if(mode==='soft'){
    rgb=[8,21,17];const colors=[[220,104,75],[145,205,91],[78,160,225]];
    for(let c=0;c<3;c++)for(let k=0;k<3;k++)rgb[k]+=Math.pow(Math.max(0,values[c]),.85)*colors[c][k];
   }else{
    const colors=mode==='relief'?[[209,175,118],[219,220,176],[175,198,164]]:[[255,84,72],[155,245,60],[36,183,255]];
    for(let c=0;c<3;c++){
     const v=Math.max(0,values[c]);
     // Iso-density membranes expose the actual contours of each colony.
     const edge=Math.exp(-Math.pow((v-.28)/.055,2));
     const inner=Math.exp(-Math.pow((v-.56)/.09,2));
     const core=Math.pow(v,1.35);
     const weight=core*.75+edge*.55+inner*.28;
     for(let k=0;k<3;k++)rgb[k]+=weight*colors[c][k];
    }
    if(mode==='relief'){
     const density=(sample(F.R,sx+1,sy,w,h)+sample(F.G,sx+1,sy,w,h)+sample(F.B,sx+1,sy,w,h))-(sample(F.R,sx-1,sy-1,w,h)+sample(F.G,sx-1,sy-1,w,h)+sample(F.B,sx-1,sy-1,w,h));
     for(let k=0;k<3;k++)rgb[k]+=density*75;
    }
   }
   const distance=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2));
   const vignette=1-.25*Math.pow(Math.min(1,distance),4);const i=(y*size+x)*4;
   for(let k=0;k<3;k++)pixels[i+k]=Math.max(0,Math.min(255,rgb[k]*exposure*vignette));pixels[i+3]=255;
  }
  ctx.putImageData(image,0,0);
 }
 return {draw,setMode(value){if(['fluorescence','relief','soft'].includes(value))mode=value;window.dispatchEvent(new Event('bloom:optics'));},setExposure(value){exposure=Math.max(.5,Math.min(2,Number(value)||1));window.dispatchEvent(new Event('bloom:optics'));}};
})();
