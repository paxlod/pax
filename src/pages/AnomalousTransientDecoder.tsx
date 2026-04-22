import React, { useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Maximize2, Crosshair, Network, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RAW_TELEMETRY = `ONOON23221212322312332422213 313122231313323322223
OPPNO233322232323322122122333332322212223233322343
33322333333324312223234333312112333333312242123333
OPPPP333332243433444233434243452335432333333454355
43333444444354344544434443444554444435435544333663
QRRQR565654555565566656446544454556765675665646556
56566655656666776666667767776777857666687878787778
77678768866886888876679878998998789788877997788A88
A9899A9798888799A997999989AAA998AABA99B8B999ABBAAA
XWXVWAA9898BAB99BAAAB9ABABBBCABABCBB9BBACABABBCACC
ABDBBABBACBCDBACCCACDCBDBABABACCCBBCCDCDCBCDDCBCEC
ZZZZYDCCCDDBCDEDCDCCDDDDDDDDDDDECDDDCDCDDEDDCEDEDD
DDCCCCEBEEDCCFDDDEDDDDDCEEDDBDDDCDDDCDCCEDDDCCDDED
DDCEBCEDDDDEECECCCCECCCCDBDDEBCBDCCCDCEDCCCBCCBDCC
DDCBCCCCCCDDCBCBBCACBBCCBABABCBBABBCAABBCABACBBBCA
WYWWWBABBAAB998AAAA9A9A9A9998A8988AA979899999AA998
88798888988877767757676777667556765655655764555555
RQRRP36654544535542342434333313332241 23131122221 
 21   2   1  1  1                                 
                                                  
                                                  
DEEDE                                             
                                                  
                                                  
                                       1 11 1 1112
22222111113223322223244454344554555664555566646556
6666567775787978887988A889988AA9AB8A98B9ABAAABAABB
XWXXXAABCCBBBBDABBBACECDCCCDDDBCCDBDBCCCDCDCDDCEBD
DDDCCDECDDCECEDEDDCEBBDCDECEDCECDDCCCDBDCDDDCCCDCC
YZWXYBCABCBCBBBBB9BB9BBBBBAAABB99A8899999889AA9997
77767768865556757765575556445443243353422331322312
2 112211   1  1                                   
                                                  
                                                  
                                                  
JIJJI                  111    11111 12112213234433
343454445344544566666655867689879899889999788B99AB
99BCA9BBCAABCBBCCCCDBDDCBCDDBBBDCDCDDCDCDCDCCBDDCB
BCDEEECDEDDDCEDECDDDCDDDDCBCCDCDCBCBBAABCBCBBBCAAB
WVVVXAAAA988AA99A778877886767776657565445555445533
422343223233 2221 111 1                           
HIHIH                                             
                                                  
                                         1 11  112
1212112123333333454634445467554666667776987889989A
WVXVW9ACBABBAABBCCDDCCCCBCDBDECCCDDCDDEEDDEDCCDCDE
EDBDDDDEEDCCDDCDCCCCECDCBABBAABBCBAAACBAA9AAAA9999
9888888888787776867656564646443444433112121 2 2111`;

function decodeAlphanumericMatrix(textData: string): number[][] {
  const lines = textData.trim().split('\n');
  const matrix: number[][] = [];
  
  for (const line of lines) {
    const row: number[] = [];
    for (const char of line) {
      if (char === ' ') {
        row.push(0);
      } else if (/[0-9]/.test(char)) {
        row.push(parseInt(char, 10));
      } else if (/[a-zA-Z]/.test(char)) {
        row.push(char.toUpperCase().charCodeAt(0) - 55);
      } else {
        row.push(0);
      }
    }
    matrix.push(row);
  }
  
  const maxLen = Math.max(...matrix.map(r => r.length));
  return matrix.map(r => {
    const diff = maxLen - r.length;
    return diff > 0 ? [...r, ...Array(diff).fill(0)] : r;
  });
}

function getMagmaColor(t: number): string {
  const stops = [
    [0.0, [0, 0, 4]],
    [0.2, [40, 11, 84]],
    [0.4, [101, 21, 110]],
    [0.6, [159, 42, 99]],
    [0.8, [212, 72, 66]],
    [0.9, [245, 121, 56]],
    [1.0, [252, 253, 191]]
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= Number(stops[i][0]) && t <= Number(stops[i+1][0])) {
      const range = Number(stops[i+1][0]) - Number(stops[i][0]);
      const localT = (t - Number(stops[i][0])) / range;
      const c1 = stops[i][1] as number[];
      const c2 = stops[i+1][1] as number[];
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(252, 253, 191)';
}

export function AnomalousTransientDecoder() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const matrix = useMemo(() => decodeAlphanumericMatrix(RAW_TELEMETRY), []);
  
  const { rows, cols, maxIntensity, peakCoords } = useMemo(() => {
    const numRows = matrix.length;
    const numCols = matrix[0]?.length || 0;
    
    let maxVal = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
      }
    }
    
    const peaks: [number, number][] = [];
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (matrix[r][c] === maxVal) peaks.push([r, c]);
      }
    }
    
    return { rows: numRows, cols: numCols, maxIntensity: maxVal, peakCoords: peaks };
  }, [matrix]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        drawHeatmap();
      }
    });
    
    resizeObserver.observe(containerRef.current);

    const drawHeatmap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cellWidth = canvas.width / cols;
      const cellHeight = canvas.height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = matrix[r][c];
          const normalized = maxIntensity > 0 ? val / maxIntensity : 0;
          ctx.fillStyle = getMagmaColor(normalized);
          ctx.fillRect(Math.floor(c * cellWidth), Math.floor(r * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
        }
      }
    };

    drawHeatmap();
    return () => resizeObserver.disconnect();
  }, [matrix, rows, cols, maxIntensity]);

  const maxChar = String.fromCharCode(maxIntensity + 55);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-orange-500/30 text-slate-300">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-full transition-colors border border-slate-700">
            <ArrowLeft className="w-5 h-5 text-orange-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-orange-500" />
              Anomalous Transient X-7 Decryption
            </h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-mono">
              2D Alphanumeric Telemetry Matrix
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metadata & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-[10px] text-orange-400 font-mono tracking-widest uppercase mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
               <Table className="w-4 h-4" /> Structural Metadata
            </h2>

            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Matrix Dimensions</span>
                <span className="font-mono text-xl text-slate-200">{rows} <span className="text-slate-600 text-sm">r</span> &times; {cols} <span className="text-slate-600 text-sm">c</span></span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex justify-between">
                   Max Signal Intensity
                   <span className="bg-orange-500/20 text-orange-400 px-2 rounded-full text-[9px] border border-orange-500/30">Alphanumeric: {maxChar}</span>
                </span>
                <span className="font-mono text-2xl text-slate-100 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]">{maxIntensity}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-2 mb-3">
                   <Crosshair className="w-3 h-3 text-red-400" /> Peak Coordinates (Row, Col)
                </span>
                <ul className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                  {peakCoords.map((coord, idx) => (
                    <li key={idx} className="font-mono text-sm text-slate-300 flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50">
                      <span className="text-slate-600 text-[10px] w-4">{idx + 1}.</span> 
                      [{coord[0]}, {coord[1]}]
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mb-4 flex items-center gap-2">
               <Maximize2 className="w-4 h-4" /> Decryption Log
            </h2>
            <div className="font-mono text-[10px] text-slate-500 space-y-2 leading-relaxed bg-black/50 p-4 rounded-lg border border-slate-800/80 h-40 overflow-y-auto">
              <p className="text-orange-400/80">[*] Initiating Anomalous Transient X-7 Decryption...</p>
              <p>[*] Parsing raw telemetry block length: {RAW_TELEMETRY.length} bytes</p>
              <p>[*] Normalizing coordinate bounds: {rows}x{cols}</p>
              <p>[*] Locating saturation limits ({maxIntensity})...</p>
              <p>[*] Translating intensity via Magma mapping...</p>
              <p className="text-emerald-400/80">[*] Heatmap mapping complete. Stand by for visual render.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Heatmap Viewer */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
           <div className="flex-1 bg-black rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative flex flex-col p-4 group">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] tracking-widest uppercase font-bold text-slate-500 font-mono">Telemetry Heatmap Projection</span>
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                   <div className="w-32 h-2 rounded-full overflow-hidden flex bg-gradient-to-r from-[#000004] via-[#b73779] to-[#fcfdbf]"></div>
                   Scale (0 - {maxIntensity})
                </div>
             </div>
             
             <div ref={containerRef} className="flex-1 relative w-full h-full min-h-[400px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                {/* Crosshairs to highlight coordinate points if hovered? Not implementing yet, just static plot as requested */}
                <canvas ref={canvasRef} className="absolute w-full h-full inset-0" style={{ imageRendering: 'pixelated' }} />
             </div>
             <div className="text-center mt-3 text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                Time/Channel Index (X) vs Time/Channel Index (Y)
             </div>
           </div>
        </div>

      </main>
    </div>
  );
}
