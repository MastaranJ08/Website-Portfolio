// Test NVIDIA API dengan endpoint yang benar
const API_KEY = "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"

async function testEndpoint(url, model, name) {
  console.log(`\n📍 Testing: ${name}`)
  console.log(`URL: ${url}`)
  console.log(`Model: ${model}`)
  
  const payload = {
    model,
    messages: [{ role: "user", content: "Hello" }]
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    console.log(`Status: ${res.status}`)
    if (res.ok) {
      const data = await res.json()
      console.log(`✅ SUCCESS! Response:`, JSON.stringify(data).substring(0, 200))
    } else {
      const text = await res.text()
      console.log(`❌ Error: ${text.substring(0, 200)}`)
    }
  } catch (err) {
    console.error(`❌ Request failed: ${err.message}`)
  }
}

async function run() {
  console.log("=" .repeat(60))
  console.log("Testing different NVIDIA API endpoints")
  console.log("=" .repeat(60))

  const tests = [
    ["https://integrate.api.nvidia.com/v1/chat/completions", "mistralai/mistral-large", "Standard endpoint v1"],
    ["https://api.nvidia.com/v1/chat/completions", "mistralai/mistral-large", "Direct api.nvidia.com"],
    ["https://integrate.api.nvidia.com/v1/completions", "mistralai/mistral-large", "v1/completions (text)"],
    ["https://integrate.api.nvidia.com/v1/engines/mistralai/mistral-large/chat/completions", "mistralai/mistral-large", "Versioned path"],
  ]

  for (const [url, model, name] of tests) {
    await testEndpoint(url, model, name)
  }

  console.log("\n" + "=" .repeat(60))
}

run()
