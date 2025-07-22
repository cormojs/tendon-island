import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styled from 'styled-components'
import { Card, Flex } from 'antd'
import { Post } from '../../common/types'

interface ToastProps {
}

const ToastContainer = styled(Flex)`
  width: 100%;
  height: 100%;
  padding: 10px;
  margin: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow: hidden;
`

const StyledCard = styled(Card) <{ fadeOut: boolean }>`
  opacity: ${props => props.fadeOut ? 0 : 1};
  transition: opacity 1s ease-out;
  max-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background: gray
  .ant-card-body {
    padding: 16px 20px;
    font-size: 14px;
    word-wrap: break-word;
  }
`

const ToastMessageList: React.FC<{ posts: { message: string, fadeOut: boolean }[] }> = ({ posts }) => {
  return (
    <ToastContainer
      vertical
      justify="center"
      align="center"
    >
      {posts.map(({ message, fadeOut }) =>
        <StyledCard
          size="small"
          fadeOut={fadeOut}
        >
          {message}
        </StyledCard>
      )}
    </ToastContainer>

  )
}

const Toast: React.FC<ToastProps> = ({ }) => {
  const [posts, setPosts] = useState<{ message: string; fadeOut: boolean; }[]>([{ message: "test", fadeOut: false }])
  const { ipcRenderer } = window.require('electron')

  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((prev) => {
        if (prev.length === 0) {
          return []
        } else {
          const next = prev.slice(0, -1)
          return next
        }
      })
    }, 4000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleSetMessage = (_event: any, message: string) => {
      console.log(message)
      setPosts((prev) => {
        const next = [{ message, fadeOut: false }, ...prev]
        next[next.length - 1].fadeOut = true
        return next
      })
    }

    const handleSetPost = (_event: any, post: Post) => {
      setPosts((prev) => {
        const next = [{
          message: post.body ?? '',
          fadeOut: false
        }, ...prev]
        next[next.length - 1].fadeOut = true
        return next
      })
    }

    ipcRenderer.on('set-message', handleSetMessage)
    ipcRenderer.on('set-post', handleSetPost)

    const timeout = posts.length === 0 ? setTimeout(() => {
      ipcRenderer.send("close-toast")
    }, 1000) : null

    return () => {
      ipcRenderer.removeListener('set-message', handleSetMessage)
      ipcRenderer.removeListener('set-post', handleSetPost)
      if (timeout !== null) {
        clearTimeout(timeout)
      }
    }
  }, [])

  return <ToastMessageList posts={posts} />
}

const App: React.FC = () => {
  return <Toast />
}

const container = document.getElementById('toast-root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
