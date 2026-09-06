/* BIKEZTAGRAM AI — lightweight universal visual focal estimation. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function luminance(r,g,b){return .2126*r+.7152*g+.0722*b;}
export function estimateCanvasFocal(canvas){
 const ctx=canvas?.getContext?.('2d',{willReadFrequently:true});
 if(!ctx||!canvas.width||!canvas.height)return{x:.5,y:.5,confidence:.2,method:'center-fallback'};
 const {data}=ctx.getImageData(0,0,canvas.width,canvas.height), cols=4, rows=4, sums=Array.from({length:16},()=>({energy:0,detail:0,count:0}));
 for(let y=1;y<canvas.height-1;y+=2){for(let x=1;x<canvas.width-1;x+=2){const i=(y*canvas.width+x)*4, lum=luminance(data[i],data[i+1],data[i+2]);const left=luminance(data[i-4],data[i-3],data[i-2]), up=luminance(data[i-canvas.width*4],data[i-canvas.width*4+1],data[i-canvas.width*4+2]);const dx=Math.abs(lum-left),dy=Math.abs(lum-up),edge=dx+dy;const c=Math.min(cols-1,Math.floor(x*cols/canvas.width)),r=Math.min(rows-1,Math.floor(y*rows/canvas.height)),cell=sums[r*cols+c];cell.energy+=edge*.7+Math.abs(lum-128)*.12;cell.detail+=edge;cell.count++;}}
 let total=0,wx=0,wy=0,best=-Infinity;for(let i=0;i<sums.length;i++){const cell=sums[i],score=cell.count?(cell.energy/cell.count)+(cell.detail/cell.count)*.65:0;const c=i%cols,r=Math.floor(i/cols),x=(c+.5)/cols,y=(r+.5)/rows;total+=score;wx+=x*score;wy+=y*score;if(score>best)best=score;}
 if(total<=0)return{x:.5,y:.5,confidence:.2,method:'center-fallback'};const x=clamp(wx/total,.2,.8),y=clamp(wy/total,.2,.8),spread=clamp(best/(total/16+1e-6)/3,0,1);return{x:Number(x.toFixed(3)),y:Number(y.toFixed(3)),confidence:Number((.3+.5*spread).toFixed(3)),method:'local-saliency-grid-v1'};
}
