import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styled from 'styled-components'

interface ToastProps {
  message?: string
}

const ToastContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow: hidden;
`

const ToastMessage = styled.div<{ fadeOut: boolean }>`
  background: #333;
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: ${props => props.fadeOut ? 0 : 1};
  transition: opacity 1s ease-out;
  word-wrap: break-word;
  max-width: 200px;
`

const Toast: React.FC<ToastProps> = ({ message = 'Toast notification' }) => {
  const [currentMessage, setCurrentMessage] = useState(message)
  const [fadeOut, setFadeOut] = useState(false)
  const { ipcRenderer } = window.require('electron')

  useEffect(() => {

    const handleSetMessage = (_event: any, msg: string) => {
      setCurrentMessage(msg)
    }

    const handleStartFadeout = () => {
      setFadeOut(true)
    }

    ipcRenderer.on('set-message', handleSetMessage)
    ipcRenderer.on('start-fadeout', handleStartFadeout)

    setTimeout(() => {
      handleStartFadeout()

      setTimeout(() => {
        ipcRenderer.send("close-toast")
      }, 1000)
    }, 4000)

    return () => {
      ipcRenderer.removeListener('set-message', handleSetMessage)
      ipcRenderer.removeListener('start-fadeout', handleStartFadeout)
    }
  }, [])

  return (
    <ToastContainer>
      <ToastMessage fadeOut={fadeOut}>
        {currentMessage}
      </ToastMessage>
    </ToastContainer>
  )
}

const App: React.FC = () => {
  return <Toast />
}

const container = document.getElementById('toast-root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
