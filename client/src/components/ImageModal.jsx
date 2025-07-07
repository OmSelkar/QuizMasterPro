"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, ExternalLink } from "lucide-react"

export function ImageModal({ isOpen, onClose, imageUrl, userName, title = "Image" }) {
  if (!isOpen || !imageUrl) return null

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `${userName || "user"}-profile-image.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    window.open(imageUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
        <DialogHeader className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between text-white">
            <div>
              <DialogTitle className="text-white">{title}</DialogTitle>
              <DialogDescription className="text-gray-300">
                {userName ? `${userName}'s profile picture` : "Profile picture"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={userName || "Profile"}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={onClose}
          />
        </div>

        {/* Click anywhere to close */}
        <div className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close modal" />
      </DialogContent>
    </Dialog>
  )
}
