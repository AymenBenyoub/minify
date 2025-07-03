import { useState } from "react"
import {
  Theme,
  TextField,
  Button,
  Heading,
  Flex,
} from "@radix-ui/themes"
import {
  ClipboardCopyIcon,
  CheckIcon,
} from "@radix-ui/react-icons"

function App() {
  const [url, setUrl] = useState("")
  const [shortUrl, setShortUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    const response = await fetch("http://localhost:8080/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) {
      console.error("Failed to shorten URL")
      return
    }
    const data = await response.json()
    setShortUrl(data.short_url)
    setUrl("") // Clear input field after submission
    setCopied(false) // Reset copied state
    
  }
  const handleCopy = async () => {
    if (!shortUrl) return
    await navigator.clipboard.writeText(shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Theme accentColor="crimson" grayColor="sand">
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
          <Heading as="h1" size="7" className="text-center">
            URL Shortener
          </Heading>

          <Flex direction="column" gap="3">
            <TextField.Root
              placeholder="Paste your long URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleSubmit} size="3">
              Shorten URL
            </Button>
          </Flex>

          {shortUrl && (
            <Flex direction="column" gap="2">
              <Heading as="h2" size="4" className="text-center">
                Shortened URL
              </Heading>

              <Flex gap="2">
                <TextField.Root
                  readOnly
                  value={shortUrl}
                  className="flex-1"
                />
                <Button variant="soft" onClick={handleCopy}>
                  {copied ? <CheckIcon /> : <ClipboardCopyIcon />}
                </Button>
              </Flex>
            </Flex>
          )}
        </div>
      </div>
    </Theme>
  )
}

export default App
