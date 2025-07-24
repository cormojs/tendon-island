import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styled from 'styled-components'
import { Avatar, Card, Flex, Image, Space } from 'antd'
import { Post } from '../../common/types'
import { Account } from 'masto/dist/esm/mastodon/entities/v1'


const ToastContainer = styled(Flex)`
  min-width: 320px;
  padding: 15px;
  margin: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow: hidden;
`

const StyledCard = styled(Card) <{ fadeOut: boolean }>`
  opacity: ${props => props.fadeOut ? 0 : 1};
  transition: opacity 3s ease-out;
  min-width: 300px;
  max-width: 300px;
  max-height: 800px;
  overflow-wrap: break-word;
  word-break: break-all;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background: rgb(40, 40, 50);
  .ant-card-body {
    padding: 16px 20px;
    font-size: 14px;
    color: white;
    word-wrap: break-word;
  }
`

const CroppedImage = styled(Image)`
  width: 80;
  height 60;
  overflow: 'hidden';
  .ant-image-img {
    width: '100%';
    height: '100%';
    objectFit: 'cover';
    objectPosition: 'center center';
  }
`

type MessageProps = {
  posts: {
    account: Account & {
      avatarBlobUrl: string
    };
    originalAccount?: Account & {
      avatarBlobUrl: string
    }
    message: string
    fadeOut: boolean
    mediaAttachments: Post['mediaAttachments']
  }[]
}

const ToastMessageList: React.FC<MessageProps> = ({ posts }) => {
  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'A' && target.getAttribute('href')) {
      event.preventDefault()
      const { shell } = window.require('electron')
      shell.openExternal(target.getAttribute('href'))
    }
  }

  return (
    <ToastContainer
      vertical
      justify="center"
      align="center"
    >
      {posts.map(({ account, originalAccount, message, fadeOut, mediaAttachments }) =>
        <StyledCard
          size="small"
          fadeOut={fadeOut}
        >
          <Flex vertical={true}>
            <Space>
              { originalAccount ?
                <Flex vertical={true} justify={'end'} align={'end'}>
                  <Avatar
                    icon={<img src={account.avatarBlobUrl} width={50} height={50}/>}
                    shape={'square'}
                    size={50}
                  />
                  <Avatar
                    icon={<img src={originalAccount.avatarBlobUrl} width={20} height={20}/>}
                    shape={'square'}
                    size={20}
                  />
                </Flex> : <Avatar
                  icon={<img src={account.avatarBlobUrl} width={50} height={50}/>}
                  shape={'square'}
                  size={50}
                />
              }
              <span
                dangerouslySetInnerHTML={{ __html: message }}
                onClick={handleClick}
              />
            </Space>
            { mediaAttachments.length !== 0 ?
              <Space>
                {
                  mediaAttachments.map(({ array, mediaType }) => (
                    <CroppedImage
                      src={URL.createObjectURL(new Blob([array], { type: mediaType }))}
                    />
                  ))
                }
              </Space> : <></>}
          </Flex>
        </StyledCard>
      )}
    </ToastContainer>

  )
}

const Toast: React.FC<{}> = ({ }) => {
  const [posts, setPosts] = useState<MessageProps['posts']>([])
  const { ipcRenderer } = window.require('electron')

  useEffect(() => {
    const interval = setInterval(() => {
      if (posts.length !== 0) {
        setPosts((prev) => {
          const next = prev.slice(0, -1)
          return next
        })
      }
    }, 10000)
    return () => {
      clearInterval(interval)
    }
  }, [posts])

  useEffect(() => {
    const handleSetPost = (_event: any, post: Post) => {
      setPosts((prev) => {
        const { avatarArray, avatarType, ...rest } = post.reblog ? post.reblog.account : post.account
        const { avatarArray: reblogAvatarArray, avatarType: reblogAvatarType, ...reblogAccountRest } = post.reblog ? post.account : {
          avatarArray: null,
          avatarType: null
        }

        const next = [{
          account: {
            ...rest,
            avatarBlobUrl: URL.createObjectURL(new Blob([avatarArray], { type: avatarType }))
          },
          originalAccount: reblogAvatarArray && reblogAvatarType && 'id' in reblogAccountRest
           ? {
            ...reblogAccountRest,
            avatarBlobUrl: URL.createObjectURL(new Blob([reblogAvatarArray], { type: reblogAvatarType }))
          } : undefined,
          message: post?.reblog?.body ?? post.body ?? '',
          mediaAttachments: post?.reblog?.mediaAttachments ?? post.mediaAttachments,
          fadeOut: false
        }, ...prev]
        return next.slice(0, 5)
      })
    }

    ipcRenderer.on('set-post', handleSetPost)

    return () => {
      ipcRenderer.removeListener('set-post', handleSetPost)
    }
  }, [posts])

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
