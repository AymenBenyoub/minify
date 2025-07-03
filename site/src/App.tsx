"use client"

import type React from "react"

import { useState } from "react"
import { Theme, TextField, Button, Heading, Text, Badge, Separator, Card } from "@radix-ui/themes"
import { ClipboardCopyIcon, CheckIcon, Link2Icon, LightningBoltIcon } from "@radix-ui/react-icons"

function App() {
  const [url, setUrl] = useState("")
  const [shortUrl, setShortUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)
    setError("")
    const shorten_url = import.meta.env.VITE_MINI_LINK_DOMAIN + "/shorten"
    try {
      const response = await fetch(shorten_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ long_url:url }),
      })

      if (!response.ok) {
        throw new Error("Failed to shorten URL")
      }

      const data = await response.json()
      setShortUrl(data.short_url)
      setUrl("")
      setCopied(false)
    } catch (err) {
      setError("Failed to shorten URL. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shortUrl) return

    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy URL")
    }
  }

  return (
    <Theme accentColor="blue" grayColor="slate" radius="large" scaling="100%">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Link2Icon width="24" height="24" color="white" />
            </div>
            <div className="text-center space-y-2">
              <Heading
                size="8"
                weight="bold"
                className="bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent"
              >
                URL Shortener
              </Heading>
              <Text size="3" className="text-gray-600">
                Transform long URLs into short, shareable links
              </Text>
            </div>
          </div>

          {/* Main Card */}
          <Card size="4" className="bg-white/90 backdrop-blur-sm border border-white/20 shadow-2xl">
            <div className="space-y-6">
              {/* Card Header */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <LightningBoltIcon width="18" height="18" className="text-blue-600" />
                  <Heading size="5" weight="medium">
                    Minify Your URL
                  </Heading>
                </div>
                <Text size="2" className="text-gray-600">
                  Paste your long URL below and get a shortened version instantly
                </Text>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <TextField.Root
                  placeholder="https://example.com/very-long-url..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  size="3"
                  disabled={isLoading}
                  className="text-base"
                />

                <Button
                  type="submit"
                  size="3"
                  disabled={!url.trim() || isLoading}
                  className={`w-full font-medium transition-all duration-200 ${
                    !url.trim() || isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <Text className="text-white">Shortening...</Text>
                      </>
                    ) : (
                      <>
                        <LightningBoltIcon width="16" height="16" />
                        <Text className="text-white">Shorten URL</Text>
                      </>
                    )}
                  </div>
                </Button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Text size="2" className="text-red-700">
                    {error}
                  </Text>
                </div>
              )}

              {/* Result */}
              {shortUrl && (
                <>
                  <Separator size="4" />
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Badge color="green" variant="soft" size="2" className="px-4 py-2 rounded-full">
                        <div className="flex items-center gap-1">
                          <CheckIcon width="12" height="12" />
                          <Text>URL Shortened Successfully</Text>
                        </div>
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Text size="2" weight="medium" className="text-gray-700">
                        Your shortened URL:
                      </Text>
                      <div className="flex gap-2">
                        <TextField.Root readOnly value={shortUrl} className="flex-1 font-mono text-sm bg-gray-50" />
                        <Button
                          variant="soft"
                          onClick={handleCopy}
                          className="min-w-10 transition-all duration-200 hover:bg-gray-100"
                        >
                          {copied ? (
                            <CheckIcon width="16" height="16" className="text-green-600" />
                          ) : (
                            <ClipboardCopyIcon width="16" height="16" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <Text size="2" className="text-gray-500">
              Free URL shortening service • No registration required
            </Text>
          </div>
        </div>
      </div>
    </Theme>
  )
}

export default App
