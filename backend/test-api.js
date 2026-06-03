// Test script untuk diagnosa NVIDIA API
const API_KEY = "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"
const API_URL = "https://integrate.api.nvidia.com/v1"

async function testGLM51() {
  console.log("🧪 Test 1: Verify NVIDIA API endpoint & GLM-5.1 model...")
  
  const payload = {
    model: "glm-5.1",
    stream: true,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello" }
    ]
  }

  try {
    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    console.log(`Status: ${res.status}`)
    console.log(`Headers:`, Object.fromEntries(res.headers))

    const text = await res.text()
    console.log(`Response (first 500 chars):\n${text.substring(0, 500)}`)

    if (!res.ok) {
      console.log("❌ API returned error!")
      return false
    }

    console.log("✅ API endpoint works!")
    return true
  } catch (err) {
    console.error("❌ API call failed:", err.message)
    return false
  }
}

async function testFluxModel() {
  console.log("\n🧪 Test 2: Test FLUX.1-Lite-4B image model...")

  const payload = {
    model: "flux.1-lite-4b",
    prompt: "A beautiful sunset"
  }

  try {
    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    console.log(`Status: ${res.status}`)
    const text = await res.text()
    console.log(`Response (first 500 chars):\n${text.substring(0, 500)}`)

    if (!res.ok) {
      console.log("❌ FLUX API returned error")
      return false
    }

    console.log("✅ FLUX endpoint works!")
    return true
  } catch (err) {
    console.error("❌ FLUX call failed:", err.message)
    return false
  }
}

async function listAvailableModels() {
  console.log("\n🧪 Test 3: List available models...")

  try {
    const res = await fetch(`${API_URL}/models`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
    })

    console.log(`Status: ${res.status}`)
    const data = await res.json()
    console.log(`Available models:`)
    console.log(JSON.stringify(data, null, 2))

    return true
  } catch (err) {
    console.error("❌ Models list failed:", err.message)
    
    // Try alternative endpoint
    console.log("\n📍 Trying alternative endpoints...")
    
    const altEndpoints = [
      `${API_URL}/models`,
      `https://integrate.api.nvidia.com/v1/models`,
      `https://api.nvidia.com/v1/models`
    ]

    for (const url of altEndpoints) {
      try {
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${API_KEY}` }
        })
        console.log(`${url} -> Status: ${res.status}`)
      } catch (e) {
        console.log(`${url} -> Failed`)
      }
    }

    return false
  }
}

async function run() {
  console.log("=" .repeat(60))
  console.log("NVIDIA API Diagnostics")
  console.log("=" .repeat(60))
  
  await testGLM51()
  await testFluxModel()
  await listAvailableModels()
  
  console.log("\n" + "=".repeat(60))
}

run()
