import { useState, useEffect, useRef } from 'react'
import { Settings, Image as ImageIcon, Download, Wand2, Dices, Layers, SlidersHorizontal, Settings2, Moon, Sun, MonitorPlay, Loader2 } from 'lucide-react'

function App() {
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [model, setModel] = useState("")
  const [resolution, setResolution] = useState("1024x1024")
  const [steps, setSteps] = useState(30)
  const [cfgScale, setCfgScale] = useState(7.5)
  const [seed, setSeed] = useState(-1)
  const [batchSize, setBatchSize] = useState(1)
  
  const [availableModels, setAvailableModels] = useState([])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [currentImages, setCurrentImages] = useState([])
  const [history, setHistory] = useState([])
  
  const wsRef = useRef(null)

  useEffect(() => {
    // Fetch models on load
    fetch("http://127.0.0.1:8000/api/models")
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models)
          setModel(data.models[0])
        }
      })
      .catch(err => console.error("Could not fetch models:", err))

    // Connect WebSocket
    const connectWs = () => {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws/progress")
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.progress !== undefined) setProgress(data.progress)
        if (data.status !== undefined) setStatus(data.status)
      }
      ws.onclose = () => {
        setTimeout(connectWs, 3000)
      }
      wsRef.current = ws
    }
    connectWs()

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const handleGenerate = async () => {
    if (!prompt) return
    
    setIsGenerating(true)
    setProgress(0)
    setStatus("Initiating...")
    setCurrentImages([])
    
    const [w, h] = resolution.split('x').map(Number)
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          negative_prompt: negativePrompt,
          style,
          resolution: [w, h],
          steps,
          cfg_scale: parseFloat(cfgScale),
          seed: parseInt(seed),
          batch_size: parseInt(batchSize)
        })
      })
      
      const data = await response.json()
      if (data.images) {
        setCurrentImages(data.images)
        setHistory(prev => [...data.images, ...prev])
      } else if (data.error) {
        setStatus(`Error: ${data.error}`)
      }
    } catch (err) {
      console.error(err)
      setStatus("Failed to connect to server.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRandomPrompt = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prompt/random")
      const data = await res.json()
      if (data.prompt) setPrompt(data.prompt)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEnhancePrompt = async () => {
    if (!prompt) return
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/prompt/enhance?prompt=${encodeURIComponent(prompt)}&style=${encodeURIComponent(style)}`, { method: "POST" })
      const data = await res.json()
      if (data.enhanced_prompt) setPrompt(data.enhanced_prompt)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownload = (imgData, filename) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imgData}`;
    link.download = filename || `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-text-main overflow-hidden font-sans">
      
      {/* Sidebar Controls */}
      <div className="w-80 flex-shrink-0 bg-surface border-r border-white/5 flex flex-col h-full overflow-y-auto z-10 custom-scrollbar">
        <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <MonitorPlay size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-wide">AI Studio</h1>
          </div>
          <Settings size={18} className="text-text-muted hover:text-white cursor-pointer transition" />
        </div>
        
        <div className="p-5 space-y-6 flex-1">
          
          {/* Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-muted flex items-center gap-2">
                <Wand2 size={14} /> Prompt
              </label>
              <div className="flex gap-2">
                <button title="Random Prompt" onClick={handleRandomPrompt} className="text-text-muted hover:text-primary transition"><Dices size={14}/></button>
                <button title="Enhance Prompt" onClick={handleEnhancePrompt} className="text-text-muted hover:text-primary transition"><Wand2 size={14}/></button>
              </div>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to see..."
              className="w-full input-field min-h-[100px] resize-none text-sm placeholder:text-white/20 shadow-inner"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-text-muted">Negative Prompt</label>
            <textarea 
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid in the image..."
              className="w-full input-field min-h-[60px] resize-none text-sm placeholder:text-white/20 shadow-inner"
            />
          </div>

          {/* Model & Style */}
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted flex items-center gap-2"><Layers size={14} /> Model</label>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="w-full input-field text-sm appearance-none cursor-pointer"
              >
                {availableModels.length === 0 && <option value="">No models found...</option>}
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted flex items-center gap-2"><ImageIcon size={14} /> Style Preset</label>
              <div className="grid grid-cols-2 gap-2">
                {["cinematic", "anime", "realistic", "cyberpunk", "fantasy", "3d render"].map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-xs py-2 px-3 rounded-md border capitalize transition ${style === s ? 'bg-primary/20 border-primary/50 text-white' : 'bg-black/30 border-white/5 text-text-muted hover:bg-white/5'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-5 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-text-muted flex items-center gap-2 mb-2"><SlidersHorizontal size={14} /> Parameters</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <label>Aspect Ratio</label>
              </div>
              <div className="flex bg-black/50 p-1 rounded-lg border border-white/5">
                {["512x512", "768x768", "1024x1024", "16:9"].map(r => (
                  <button 
                    key={r}
                    onClick={() => setResolution(r === "16:9" ? "1024x576" : r)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition ${resolution === r || (resolution === "1024x576" && r === "16:9") ? 'bg-surface-hover text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <label>Steps</label>
                <span>{steps}</span>
              </div>
              <input type="range" min="10" max="150" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="w-full accent-primary h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <label>CFG Scale</label>
                <span>{cfgScale}</span>
              </div>
              <input type="range" min="1" max="20" step="0.5" value={cfgScale} onChange={(e) => setCfgScale(parseFloat(e.target.value))} className="w-full accent-primary h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-text-muted block">Seed (-1 for random)</label>
                <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-full input-field text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-muted block">Batch Size</label>
                <input type="number" min="1" max="4" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} className="w-full input-field text-sm font-mono" />
              </div>
            </div>

          </div>
        </div>

        {/* Generate Button Sticky Footer */}
        <div className="p-5 border-t border-white/5 bg-surface mt-auto sticky bottom-0 z-20">
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt || !model}
            className="w-full btn-primary h-12 flex items-center justify-center gap-2 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2 animate-pulse">
                <Wand2 size={18} className="animate-spin" /> Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Wand2 size={18} /> Generate</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center bg-[#0a0a0a] relative overflow-y-auto custom-scrollbar">
        {/* Top Navbar inside main area */}
        <div className="w-full p-6 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent sticky top-0 z-10 pointer-events-none">
          <div className="pointer-events-auto flex gap-4">
            {/* Nav tabs could go here */}
          </div>
        </div>

        <div className="w-full max-w-6xl px-8 pb-24 pt-4 flex-1 flex flex-col">
          {/* Progress / Current Generation area */}
          <div className="mb-12 min-h-[400px] flex flex-col items-center justify-center bg-surface/30 rounded-2xl border border-white/5 backdrop-blur-sm p-8 shadow-2xl relative overflow-hidden group">
            
            {/* Background glowing orb effect */}
            {isGenerating && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
            )}

            {!isGenerating && currentImages.length === 0 ? (
              <div className="text-center flex flex-col items-center text-text-muted/50 gap-4">
                <ImageIcon size={64} strokeWidth={1} />
                <p className="text-sm">Your imagination awaits. Enter a prompt to begin.</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center z-10 space-y-6">
                
                {/* Generated Images Grid */}
                {currentImages.length > 0 && (
                  <div className={`grid gap-6 w-full ${currentImages.length === 1 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-2 max-w-4xl'}`}>
                    {currentImages.map((img, idx) => (
                      <div key={idx} className="relative group/img rounded-xl overflow-hidden border border-white/10 shadow-xl transition hover:border-primary/50">
                        <img src={`data:image/png;base64,${img.data}`} alt="Generated" className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition duration-300 flex items-center justify-center gap-4 backdrop-blur-sm p-4">
                           {/* Quick Actions */}
                           <button onClick={() => handleDownload(img.data, img.filename)} className="p-3 bg-white/10 hover:bg-primary text-white rounded-full transition transform hover:scale-110 shadow-lg"><Download size={20}/></button>
                           {/* Upscale / Variations buttons could go here */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && currentImages.length === 0 && (
                  <div className="w-full max-w-md flex flex-col items-center space-y-6">
                    <div className="relative flex items-center justify-center w-24 h-24">
                      <div className="absolute inset-0 rounded-full border-t-2 border-primary/20 animate-spin" style={{ animationDuration: '3s' }}></div>
                      <div className="absolute inset-2 rounded-full border-t-2 border-primary/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                      <Loader2 className="animate-spin text-primary" size={40} />
                    </div>

                    <div className="w-full space-y-2">
                      <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5 relative">
                         <div 
                           className="bg-primary h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                           style={{ width: `${progress}%` }}
                         />
                      </div>
                      <div className="flex justify-between w-full text-xs text-text-muted font-mono">
                        <span className="animate-pulse">{status}...</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History Gallery */}
          {history.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Layers size={20} className="text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Recent Creations</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {history.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-white/5 group bg-surface cursor-pointer aspect-square">
                    <img src={`data:image/png;base64,${img.data}`} alt="History" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 p-4 flex flex-col justify-end">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(img.data, img.filename); }} className="self-end p-2 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full transition text-white"><Download size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}

export default App
