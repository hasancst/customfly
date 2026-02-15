# Self-Hosted AI Setup Guide

Panduan lengkap untuk menggunakan AI self-hosted (Ollama) sebagai pengganti Google Gemini.

## Kenapa Self-Hosted?

✅ **Keuntungan**:
- Gratis unlimited (no quota)
- Privacy terjaga (data tidak keluar server)
- Lebih cepat (no network latency ke cloud)
- Tidak tergantung internet

❌ **Kekurangan**:
- Butuh resource server (RAM/GPU)
- Kualitas response mungkin lebih rendah
- Perlu maintenance sendiri

## Recommended: Ollama

### System Requirements

**Minimum** (CPU only):
- RAM: 8GB
- Storage: 10GB
- CPU: 4 cores

**Recommended** (with GPU):
- RAM: 16GB
- Storage: 20GB
- GPU: NVIDIA dengan 8GB VRAM
- CUDA support

### Installation

#### 1. Install Ollama

```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Verify installation
ollama --version
```

#### 2. Download Model

Pilih model sesuai RAM server Anda:

```bash
# Ringan - 4GB RAM (Recommended untuk mulai)
ollama pull llama3.2:3b

# Medium - 8GB RAM (Balance)
ollama pull llama3.1:8b

# Multilingual - 8GB RAM (Bagus untuk Indonesia)
ollama pull qwen2.5:7b

# Coding - 8GB RAM
ollama pull mistral:7b
```

#### 3. Test Model

```bash
# Test interaktif
ollama run llama3.2:3b

# Test dengan prompt
ollama run llama3.2:3b "Jelaskan apa itu AI dalam 1 kalimat"
```

#### 4. Start Ollama Server

```bash
# Start as service (auto-start on boot)
sudo systemctl enable ollama
sudo systemctl start ollama

# Check status
sudo systemctl status ollama

# View logs
sudo journalctl -u ollama -f
```

### Configuration

#### 1. Update Backend .env

```bash
cd /www/wwwroot/custom.local/backend
nano .env
```

Add/update these lines:

```env
# Change provider to ollama
AI_PROVIDER=ollama

# Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Keep Gemini as fallback (optional)
GEMINI_API_KEY=your_key_here
```

#### 2. Update llmService.js

The service will automatically detect AI_PROVIDER and use Ollama:

```javascript
// backend/services/ai/providers/llmService.js
const provider = process.env.AI_PROVIDER || 'gemini';

if (provider === 'ollama') {
    // Use Ollama
    const ollama = require('./ollamaService.js');
    return ollama.analyze(systemPrompt, userPrompt);
} else {
    // Use Gemini
    return gemini.analyze(systemPrompt, userPrompt);
}
```

#### 3. Restart Backend

```bash
sudo systemctl restart imcst-backend
sudo systemctl status imcst-backend
```

### Testing

#### 1. Health Check

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return list of installed models
```

#### 2. Test AI Chat

1. Open Designer page
2. Open AI Chat
3. Send message: "tambahkan upload foto"
4. Should work without quota limit!

#### 3. Check Logs

```bash
# Backend logs
sudo journalctl -u imcst-backend -f

# Ollama logs
sudo journalctl -u ollama -f
```

## Model Comparison

| Model | Size | RAM | Speed | Quality | Use Case |
|-------|------|-----|-------|---------|----------|
| llama3.2:3b | 2GB | 4GB | ⚡⚡⚡ | ⭐⭐⭐ | Quick tasks, testing |
| llama3.1:8b | 4.7GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Production, balanced |
| mistral:7b | 4.1GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Coding, reasoning |
| qwen2.5:7b | 4.7GB | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Multilingual (ID/EN) |
| gemini-flash | Cloud | 0 | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Best quality, quota limit |

## Performance Tuning

### 1. GPU Acceleration (NVIDIA)

```bash
# Install NVIDIA drivers
sudo apt install nvidia-driver-535

# Install CUDA
sudo apt install nvidia-cuda-toolkit

# Verify GPU
nvidia-smi

# Ollama will automatically use GPU
```

### 2. CPU Optimization

```bash
# Set number of threads
export OLLAMA_NUM_THREADS=4

# Set context size (lower = faster)
export OLLAMA_CONTEXT_SIZE=2048
```

### 3. Memory Management

```bash
# Limit model memory
export OLLAMA_MAX_LOADED_MODELS=1

# Unload model after use
export OLLAMA_KEEP_ALIVE=5m
```

## Troubleshooting

### Problem: Ollama not starting

```bash
# Check if port 11434 is in use
sudo lsof -i :11434

# Kill process if needed
sudo kill -9 <PID>

# Restart Ollama
sudo systemctl restart ollama
```

### Problem: Model too slow

**Solutions**:
1. Use smaller model (llama3.2:3b)
2. Reduce context size
3. Add GPU
4. Increase RAM

### Problem: Out of memory

```bash
# Check memory usage
free -h

# Use smaller model
ollama pull llama3.2:3b

# Or increase swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Problem: Response not JSON

Update prompt in `aiService.js` to be more explicit:

```javascript
const systemPrompt = `
...
CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no explanation.
Example:
{
  "message": "...",
  "actions": [...]
}
`;
```

## Monitoring

### 1. Resource Usage

```bash
# Monitor Ollama
watch -n 1 'ps aux | grep ollama'

# Monitor GPU (if available)
watch -n 1 nvidia-smi

# Monitor RAM
watch -n 1 free -h
```

### 2. Request Logs

```bash
# Ollama logs
sudo journalctl -u ollama -f

# Backend AI logs
sudo journalctl -u imcst-backend -f | grep "\[LLM\]"
```

## Advanced: Multiple Models

You can run multiple models for different tasks:

```env
# .env
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434

# Use different models for different tasks
OLLAMA_MODEL_CHAT=llama3.2:3b        # Fast for chat
OLLAMA_MODEL_ANALYSIS=qwen2.5:7b     # Better for analysis
OLLAMA_MODEL_CODE=mistral:7b         # Best for code
```

## Cost Comparison

### Gemini (Cloud)
- Free: 20 requests/day
- Paid: $0.35 per 1M tokens
- Monthly (1000 req/day): ~$10-50

### Ollama (Self-Hosted)
- Setup: $0 (use existing server)
- Running: $0 (electricity only)
- Monthly: ~$5-10 (electricity)
- **Savings**: 80-90%

## Migration Checklist

- [ ] Install Ollama
- [ ] Download model
- [ ] Test model locally
- [ ] Update .env (AI_PROVIDER=ollama)
- [ ] Restart backend
- [ ] Test AI Chat
- [ ] Monitor performance
- [ ] Tune if needed

## Support

**Ollama Documentation**: https://ollama.ai/docs
**Model Library**: https://ollama.ai/library
**GitHub**: https://github.com/ollama/ollama

**Issues?**
1. Check logs: `sudo journalctl -u ollama -f`
2. Test model: `ollama run llama3.2:3b "test"`
3. Check health: `curl http://localhost:11434/api/tags`

---

**Status**: Ready for Production  
**Recommended Model**: llama3.2:3b (untuk mulai)  
**Upgrade Path**: llama3.1:8b atau qwen2.5:7b (jika butuh kualitas lebih)
