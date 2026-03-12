# 🎨 Local AI Image Generator Studio

A high-performance, **100% private**, and entirely local AI image generation suite. Built with a modern **FastAPI** backend and a sleek **React + Tailwind CSS v4** frontend.

---

## 📸 Example Results

Experience the quality of local generation across different styles:

| 🎬 Cinematic | 🧚 Fantasy | 📸 Realistic |
|:---:|:---:|:---:|
| ![Example 1](outputs/out_1773221224_-1_0.png) | ![Example 2](outputs/out_1773231874_-1_0.png) | ![Example 3](outputs/out_1773238482_-1_0.png) |
| ![Example 4](outputs/out_1773241906_-1_0.png) | ![Example 5](outputs/out_1773274172_-1_0.png) | ![Example 6](outputs/out_1773285981_-1_0.png) |

---

## ✨ Key Features

- **🚀 100% Offline**: No API keys, no subscriptions, no tracking. Your data stays on your disk.
- **🖼️ SDXL & SD 1.5 Support**: Full compatibility with `.safetensors` and `.ckpt` checkpoints.
- **💎 Premium UI**: Modern dark-mode interface with glassmorphism and smooth animations.
- **⚡ Real-time Feedback**: WebSocket-powered progress bar with custom pulsing animations.
- **🛠️ Professional Controls**: Precise tuning for Seed, Steps, CFG Scale, and Aspect Ratios (1:1, 16:9, etc.).
- **🪄 Magic Enhancer**: Built-in prompt engineering engine to transform simple ideas into masterpieces.
- **📥 One-Click Download**: Instantly save your favorite creations to your local machine.

---

## 💻 Technical Specifications

### System Requirements
| Component | Minimum Requirement | Recommended |
|:---|:---|:---|
| **OS** | Windows 10/11, Linux, macOS | Windows 11 / Ubuntu |
| **Python** | 3.10.x | 3.10.11 |
| **Node.js** | v18.x (LTS) | v20.x (LTS) |
| **GPU** | NVIDIA (2GB+ VRAM) | NVIDIA RTX (8GB+ VRAM) |
| **RAM** | 16GB | 32GB |

> [!IMPORTANT]
> NVIDIA GPUs with **CUDA** are required for high-speed generation. Older cards like the **GTX 750 Ti** are supported but will be slower.

---

## 📂 Project Structure

Organize your assets in the following directories:
- 🏗️ `/models`: Your primary `.safetensors` or `.ckpt` models.
- 🎨 `/lora`: Specific LoRA enhancement files.
- 📂 `/outputs`: Where your masterpieces are automatically saved.

---

## 🛠️ Installation & Setup

### ⚡ Quick Start (Recommended)
We provide automation scripts for a hassle-free setup:
- **Windows**: Double-click `install.bat`.
- **Linux/Mac**: Run `chmod +x install.sh` followed by `./install.sh`.

### 📖 Manual Installation
If you prefer setting up manually, follow these steps:

#### 1. Backend Setup
```powershell
# Navigate to backend folder
cd backend
python -m venv venv
.\venv\Scripts\activate

# Install Torch with CUDA 11.8 support
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

#### 2. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend
npm install
```

---

## 🚀 Running the App

You will need **two terminal windows** open simultaneously:

### Window 1: API Server (Backend)
```powershell
cd backend
.\venv\Scripts\activate
python main.py
```

### Window 2: Web Interface (Frontend)
```bash
cd frontend
npm run dev
```

🌐 **Access the Studio:** Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚡ Performance Tips

- **Memory Optimization**: This studio automatically uses `cpu_offload` and half-precision (FP16) where possible to support 6GB-12GB GPUs efficiently.
- **XFormers**: For NVIDIA users, `xformers` is integrated to significantly boost generation speed and reduce VRAM usage.

---
*Created with ❤️ for the AI Art community.*