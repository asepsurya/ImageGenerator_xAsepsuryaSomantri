import { useState, useEffect, useRef } from 'react'
import { 
  Settings, Image as ImageIcon, Download, Wand2, Dices, Layers, 
  SlidersHorizontal, Settings2, Moon, Sun, MonitorPlay, Loader2,
  Compass, MessageSquare, Film, LayoutGrid, ChevronDown, Sparkles,
  Maximize2, Copy, RefreshCw, User, X, Box, ShoppingBag, Store
} from 'lucide-react'

function App() {
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [model, setModel] = useState("")
  const [resolution, setResolution] = useState("1:1")
  const [size, setSize] = useState("Medium") // Small, Medium, Large
  const [steps, setSteps] = useState(30)
  const [cfgScale, setCfgScale] = useState(7.5)
  const [seed, setSeed] = useState(-1)
  const [batchSize, setBatchSize] = useState(4)
  const [referenceImage, setReferenceImage] = useState(null)
  const [strength, setStrength] = useState(0.75)
  
  const [availableModels, setAvailableModels] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [currentImages, setCurrentImages] = useState([])
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('image_gen_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  })
  
  const [clientId] = useState(() => {
    let id = localStorage.getItem('image_gen_client_id');
    if (!id) {
      id = Math.random().toString(36).substring(7);
      localStorage.setItem('image_gen_client_id', id);
    }
    return id;
  })

  const [lightboxImage, setLightboxImage] = useState(null)
  
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting, connected, disconnected
  
  const wsRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('image_gen_history', JSON.stringify(history));
  }, [history])

  useEffect(() => {
    console.log("Initializing App components...");
    
    // Fetch models on load
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    fetch(`${apiBaseUrl}/api/models`)
      .then(res => res.json())
      .then(data => {
        console.log("Fetched models:", data.models);
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models)
          setModel(data.models[0])
        }
      })
      .catch(err => console.error("Could not fetch models:", err))

    // Connect WebSocket
    let reconnectTimer;
    const connectWs = () => {
      console.log("Connecting to WebSocket with clientId:", clientId);
      setWsStatus("connecting");
      
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws';
      const wsBaseUrl = apiBaseUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsBaseUrl}/ws/progress?client_id=${clientId}`;
      
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log("WebSocket connected successfully!");
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("WebSocket Message:", data);
          if (data.progress !== undefined) setProgress(data.progress)
          if (data.status !== undefined) setStatus(data.status)
          
          // Isolated sequential update: append image as it finishes
          if (data.data) {
            setCurrentImages(prev => {
              // Avoid duplicates if same data sent
              if (prev.some(img => img.data === data.data)) return prev;
              return [...prev, { data: data.data, filename: `gen-${Date.now()}.png` }]
            })
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      }
      
      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setWsStatus("disconnected");
      };

      ws.onclose = (event) => {
        console.warn("WebSocket closed. Attempting reconnect in 3s...", event.reason);
        setWsStatus("disconnected");
        reconnectTimer = setTimeout(connectWs, 3000)
      }
      wsRef.current = ws
    }
    connectWs()

    return () => {
      if (wsRef.current) wsRef.current.close()
      clearTimeout(reconnectTimer);
    }
  }, [])

  const handleGenerate = async () => {
    if (!prompt) return
    
    console.log("Starting generation for prompt:", prompt);
    setIsGenerating(true)
    setProgress(0)
    setStatus("Initiating...")
    setCurrentImages([])
    
    // Resolution Mapping and Snapping helper
    const snapTo8 = (v) => Math.round(v / 8) * 8;
    
    let w = 1024, h = 1024;
    if (resolution === "2:3") { w = 896; h = 1344; }
    else if (resolution === "16:9") { w = 1344; h = 768; }
    else if (resolution === "Custom") { w = 1024; h = 1024; }

    // Size Multiplier and snapping to 8
    if (size === "Small") { w = snapTo8(w * 0.8); h = snapTo8(h * 0.8); }
    else if (size === "Large") { w = snapTo8(w * 1.1); h = snapTo8(h * 1.1); }
    else { w = snapTo8(w); h = snapTo8(h); }
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          negative_prompt: negativePrompt,
          style,
          resolution: [w, h],
          steps: parseInt(steps) || 30,
          cfg_scale: parseFloat(cfgScale) || 7.5,
          seed: isNaN(parseInt(seed)) ? -1 : parseInt(seed),
          batch_size: parseInt(batchSize) || 4,
          client_id: clientId,
          image_reference: referenceImage,
          strength: parseFloat(strength) || 0.75
        })
      })
      
      if (!response.ok) {
        let errData = { error: `Server error: ${response.status}` };
        try { errData = await response.json() } catch(e) {}
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json()
      console.log("Generation complete:", data);

      if (data.images) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const newEntry = {
          id: Date.now(),
          date: dateStr,
          time: timestamp,
          prompt: prompt,
          images: data.images
        };
        
        // We set final images here too to ensure we have all of them (filenames might be better)
        setCurrentImages(data.images)
        setHistory(prev => [newEntry, ...prev])
      } else if (data.error) {
        setStatus(`Error: ${data.error}`)
        console.error("Backend returned error:", data.error);
      }
    } catch (err) {
      console.error("Fetch error:", err)
      let msg = err.message;
      if (msg && msg.toLowerCase().includes("launch timed out")) {
        msg = "GPU Timeout: Your GPU took too long to respond. Try reducing 'Steps' or 'Resolution', or use smaller models.";
      }
      setStatus(`Failed: ${msg}`)
    } finally {
      setIsGenerating(false)
      if (progress > 90) setProgress(100)
    }
  }

  const handleRandomPrompt = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBaseUrl}/api/prompt/random`)
      const data = await res.json()
      if (data.prompt) setPrompt(data.prompt)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEnhancePrompt = async () => {
    if (!prompt) return
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiBaseUrl}/api/prompt/enhance?prompt=${encodeURIComponent(prompt)}&style=${encodeURIComponent(style)}`, { method: "POST" })
      const data = await res.json()
      if (data.enhanced_prompt) setPrompt(data.enhanced_prompt)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownload = (imgData, filename) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${imgData}`;
    link.download = filename || `gen-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  // Group history by date
  const groupedHistory = history.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
    return groups;
  }, {});

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-text-main overflow-hidden font-sans">
      
      {/* 1. Far Left Nav Bar */}
      <div className="w-[72px] flex-shrink-0 bg-sidebar-nav border-r border-border-subtle flex flex-col items-center py-6 z-30">
        <div className="mb-8">
          <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <Sun size={24} fill="currentColor" />
          </div>
        </div>
        
        <div className="flex flex-col gap-4 flex-1">
          <button className="nav-item"><Compass size={22} /></button>
          <button className="nav-item"><MessageSquare size={22} /></button>
          <button className="nav-item active"><ImageIcon size={22} /></button>
          <button className="nav-item"><Film size={22} /></button>
          <button className="nav-item"><LayoutGrid size={22} /></button>
        </div>

        <div className="mt-auto">
          <button className="w-10 h-10 rounded-full overflow-hidden border border-border-strong hover:border-primary transition-all">
            <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-muted">
              <User size={20} />
            </div>
          </button>
        </div>
      </div>

      {/* 2. Middle Configuration Sidebar */}
      <div className="w-[340px] flex-shrink-0 bg-surface border-r border-border-subtle flex flex-col h-full z-20">
        <div className="p-6 flex items-center justify-between border-b border-border-subtle">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight">Images</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Disconnected'}
              </span>
            </div>
          </div>
          <Settings size={18} className="text-text-muted hover:text-white cursor-pointer transition" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          {/* Reference Image Upload */}
          <div className="space-y-3">
            <label className="config-label flex items-center gap-2">
              <ImageIcon size={14} className="text-primary" /> Reference Image
            </label>
            
            {!referenceImage ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-subtle rounded-2xl bg-black/20 hover:bg-black/40 hover:border-primary transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Download className="w-8 h-8 mb-3 text-text-muted rotate-180" />
                  <p className="text-xs text-text-muted"><span className="font-bold">Upload</span> image reference</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-primary/50 group">
                <img src={referenceImage} alt="Reference" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                   <button onClick={() => setReferenceImage(null)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
                     <X size={16} />
                   </button>
                   <label className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark transition cursor-pointer">
                     <RefreshCw size={16} />
                     <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                   </label>
                </div>
              </div>
            )}
            
            {referenceImage && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  <label>Ref Strength</label>
                  <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-md">{strength}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.95" 
                  step="0.05" 
                  value={strength} 
                  onChange={(e) => setStrength(parseFloat(e.target.value))} 
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary" 
                />
                <p className="text-[10px] text-text-muted italic">Higher = less like original, Lower = more like original</p>
              </div>
            )}
          </div>

          {/* Model / Preset */}
          <div>
            <label className="config-label">Model / Preset</label>
            <div className="relative group">
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="select-neuro pr-10 pl-10"
              >
                {availableModels.length === 0 && <option value="">Loading models...</option>}
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                <Box size={16} />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-white transition">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between">
              <label className="config-label">Image Prompt</label>
              <div className="flex gap-2 mb-2">
                <button title="Random Prompt" onClick={handleRandomPrompt} className="text-text-muted hover:text-primary transition p-1"><Dices size={14}/></button>
                <button title="Enhance Prompt" onClick={handleEnhancePrompt} className="text-text-muted hover:text-primary transition p-1"><Wand2 size={14}/></button>
              </div>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type a prompt..."
              className="input-neuro min-h-[120px] resize-none scroll-m-0"
            />
          </div>

          {/* Style */}
          <div>
            <label className="config-label flex items-center gap-2">
              <Sparkles size={12} className="text-primary" /> Style
            </label>
            <div className="relative">
              <select className="select-neuro pl-10" value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="dynamic">Dynamic</option>
                <option value="cinematic">Cinematic</option>
                <option value="anime">Anime</option>
                <option value="realistic">Realistic</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="fantasy">Fantasy</option>
                <option value="3d render">3D Render</option>
                <option value="product">Product</option>
                <option value="affiliate">Affiliate</option>
                <option value="poster">Poster/Marketing</option>
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                {style === 'product' ? <ShoppingBag size={14} /> : style === 'affiliate' ? <Store size={14} /> : <ImageIcon size={14} />}
              </div>
            </div>
          </div>

          {/* Contrast */}
          <div>
            <label className="config-label flex items-center gap-2">
              <Sun size={12} /> Contrast
            </label>
            <select className="select-neuro">
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Dimensions */}
          <div>
            <label className="config-label">Image Dimensions</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "2:3", icon: "narrow" },
                { label: "1:1", icon: "square" },
                { label: "16:9", icon: "wide" },
                { label: "Custom", icon: "custom" }
              ].map(d => (
                <button 
                  key={d.label}
                  onClick={() => setResolution(d.label)}
                  className={`dimension-btn ${resolution === d.label ? 'active' : ''}`}
                >
                  <div className={`w-3 h-4 border-2 rounded-[2px] ${d.label === '2:3' ? 'h-4 w-3' : d.label === '16:9' ? 'w-4 h-2.5' : 'w-3.5 h-3.5'} border-current`}></div>
                  <span className="text-[10px] uppercase font-bold">{d.label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
              {["Small", "Medium", "Large"].map(s => (
                <button 
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition ${size === s ? 'bg-surface-hover text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
                >
                  {s}
                  <div className="text-[9px] opacity-40 font-normal">
                    {s === 'Small' ? '896 x 896' : s === 'Medium' ? '1024 x 1024' : '1120 x 1120'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Number of Images */}
          <div>
            <label className="config-label">Number of Images</label>
            <div className="flex bg-black/40 p-1 rounded-xl border border-border-subtle">
              {[1, 2, 3, 4].map(n => (
                <button 
                  key={n}
                  onClick={() => setBatchSize(n)}
                  className={`flex-1 py-2 flex items-center justify-center rounded-lg transition ${batchSize === n ? 'bg-surface-hover text-white' : 'text-text-muted hover:text-white'}`}
                >
                   <div className={`w-4 h-4 rounded-sm border-[1.5px] border-current flex items-center justify-center flex-wrap gap-[1px] p-[1px]`}>
                      {Array.from({length: n}).map((_, i) => (
                        <div key={i} className={`bg-current ${n === 1 ? 'w-2 h-2' : 'w-[2px] h-[2px]'}`}></div>
                      ))}
                   </div>
                   <span className="ml-2 text-xs font-bold">{n}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Accordion */}
          <div className="pt-4 border-t border-border-subtle">
             <button 
               onClick={() => setShowAdvanced(!showAdvanced)}
               className="w-full flex items-center justify-between text-text-muted hover:text-white transition"
             >
                <div className="flex items-center gap-2">
                  <Settings2 size={16} />
                  <span className="text-sm font-medium">Advanced Settings</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
             </button>
             
             {showAdvanced && (
               <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Negative Prompt</label>
                    <textarea 
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid..."
                      className="input-neuro text-xs min-h-[60px] resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <label>Steps</label>
                      <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-md">{steps}</span>
                    </div>
                    <input type="range" min="10" max="150" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <label>CFG Scale</label>
                      <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-md">{cfgScale}</span>
                    </div>
                    <input type="range" min="1" max="20" step="0.5" value={cfgScale} onChange={(e) => setCfgScale(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <label>Seed (-1 for random)</label>
                    </div>
                    <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} className="input-neuro text-xs py-2 font-mono" />
                  </div>
               </div>
             )}
          </div>

          {/* Face Match placeholder */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-text-muted">
              <User size={16} />
              <span className="text-sm font-medium">Face Match</span>
            </div>
            <div className="w-10 h-5 bg-black/40 rounded-full border border-border-subtle relative transition cursor-pointer">
              <div className="absolute left-1 top-1 w-2.5 h-2.5 bg-text-muted rounded-full"></div>
            </div>
          </div>

        </div>

        {/* Generate Button Container */}
        <div className="p-6 border-t border-border-subtle bg-surface">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt || !model}
            className="btn-generate relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="relative z-10">Generate</span>
                <Sparkles size={18} className="relative z-10" />
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Gallery Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-background relative px-10 py-8">
        
        {/* Current Generation / Progress State */}
        {isGenerating && (
          <div className="max-w-7xl mx-auto mb-12 animate-in fade-in duration-500">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Generating New Masterpiece...</h3>
                <span className="text-xs text-text-muted ml-auto font-mono">{progress}%</span>
             </div>
             
             <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  {currentImages.map((img, i) => (
                    <div key={i} className="relative rounded-2xl overflow-hidden border border-border-primary bg-surface-hover aspect-square w-full max-w-[280px] animate-in zoom-in-95 duration-500">
                      <img 
                        src={`data:image/png;base64,${img.data}`} 
                        alt="Generating" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-2 right-2 p-1.5 bg-primary rounded-full shadow-lg">
                        <Sparkles size={12} className="text-white" />
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, batchSize - currentImages.length) }).map((_, i) => (
                    <div key={i + currentImages.length} className="relative rounded-2xl overflow-hidden border border-border-subtle bg-surface-hover aspect-square w-full max-w-[280px] flex flex-col items-center justify-center gap-4">
                       <div className="w-12 h-12 rounded-full border-t-2 border-primary/40 animate-spin"></div>
                       <p className="text-[10px] text-text-muted uppercase font-bold tracking-tighter animate-pulse">Waiting...</p>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col gap-2 max-w-2xl">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-muted uppercase">Prompt</span>
                      <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                   </div>
                   <p className="text-sm text-text-main/60 italic">"{prompt}"</p>
                   <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                   </div>
                   <p className="text-[10px] text-text-muted font-mono">{status}</p>
                </div>
             </div>
          </div>
        )}

        {history.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted/20">
            <ImageIcon size={120} strokeWidth={0.5} />
            <p className="text-xl font-medium mt-4">Start creating your vision</p>
          </div>
        )}

        {/* Grouped History List */}
        <div className="max-w-7xl mx-auto space-y-12">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date} className="space-y-6">
              <h3 className="text-sm font-bold text-text-muted">{date}</h3>
              
              <div className="space-y-10">
                {entries.map((entry) => (
                  <div key={entry.id} className="space-y-4">
                    {/* Images Grid */}
                    <div className="flex flex-wrap gap-4">
                      {entry.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-border-subtle bg-surface-hover aspect-square w-full max-w-[280px]">
                          <img 
                            src={`data:image/png;base64,${img.data}`} 
                            alt="Generated" 
                            className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center gap-2">
                             <button onClick={() => handleDownload(img.data, img.filename)} className="p-2 bg-white/10 hover:bg-primary text-white rounded-full backdrop-blur-md transition transform hover:scale-110">
                               <Download size={18}/>
                             </button>
                             <button onClick={() => setLightboxImage(img)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition transform hover:scale-110">
                               <Maximize2 size={18}/>
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-baseline gap-2">
                         <span className="text-xs font-bold text-text-muted uppercase">Prompt</span>
                         <p className="text-sm text-text-main/80 line-clamp-2 leading-relaxed">
                            {entry.prompt}
                         </p>
                         <span className="text-[10px] text-text-muted ml-auto whitespace-nowrap">{entry.time}</span>
                      </div>

                      <div className="flex items-center gap-2">
                         <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-border-subtle transition text-xs font-bold">
                            <Maximize2 size={14} /> Upscale
                         </button>
                         <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-border-subtle transition text-xs font-bold">
                            <Download size={14} /> Download
                         </button>
                         <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-border-subtle transition text-xs font-bold">
                            <Copy size={14} /> Copy
                         </button>
                         <button 
                            onClick={() => { setPrompt(entry.prompt); handleGenerate(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-border-subtle transition text-xs font-bold"
                         >
                            <RefreshCw size={14} /> Generate Again
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      {/* Lightbox Preview */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
           <button 
             onClick={() => setLightboxImage(null)}
             className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition"
           >
             <X size={24} />
           </button>
           
           <div className="relative max-w-5xl max-h-full group">
             <img 
               src={`data:image/png;base64,${lightboxImage.data}`} 
               alt="Preview" 
               className="max-h-[85vh] w-auto rounded-3xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-500"
             />
             
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <button 
                 onClick={() => handleDownload(lightboxImage.data, lightboxImage.filename)}
                 className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition shadow-lg"
               >
                 <Download size={18} /> Download High Res
               </button>
               <button 
                 onClick={() => { navigator.clipboard.writeText(prompt); }}
                 className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition"
                 title="Copy Prompt"
               >
                 <Copy size={18} />
               </button>
             </div>
           </div>
        </div>
      )}

      </div>
      
    </div>
  )
}

export default App
