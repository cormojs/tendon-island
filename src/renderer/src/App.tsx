import React, { useState, useEffect } from 'react'
import { Button, Input, Space, Typography, Card, Alert, Flex } from 'antd'
import { AuthInfo } from 'src/common/types'

const { Text } = Typography

function App(): React.JSX.Element {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authInfo, setAuthInfo] = useState<AuthInfo[]>([])

  useEffect(() => {
    const loadAuthInfo = async () => {
      try {
        const info = await window.electron.ipcRenderer.invoke('get-auth-info')
        if (info && info.length > 0) {
          setAuthInfo(info)
        }
      } catch (error) {
        console.error('Failed to load auth info:', error)
      }
    }

    loadAuthInfo()
  }, [])

  const handleOAuthLogin = async () => {
    if (!domain.trim()) {
      setError('Mastodonサーバーのドメインを入力してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      window.electron.ipcRenderer.send('start-oauth', domain.trim())
    } catch (err) {
      setError('認証の開始に失敗しました')
      console.error('OAuth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value)
    if (error) setError('')
  }
  return (
    <Flex
      vertical={true}
      style={{
        minHeight: '100vh',
        padding: '20px',
        background: '#f5f5f5'
      }}>
      <Card style={{ width: 500, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'left', width: '100%' }}>
            {authInfo.map((auth, index) => (
              <Card
                key={index}
                size="small"
                style={{
                  marginBottom: '10px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <Space direction="vertical" size="small">
                  <Text type="secondary"><Text strong>@{auth.acct}</Text>@{auth.domain}</Text>
                </Space>
              </Card>
            ))}
          </div>
        </Space>
      </Card>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Text type="secondary">
            Mastodonサーバーのドメインを入力してログインしてください
          </Text>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="例: mastodon.social"
              value={domain}
              onChange={handleDomainChange}
              size="large"
              style={{ width: '100%' }}
              onPressEnter={handleOAuthLogin}
            />

            {error && (
              <Alert message={error} type="error" showIcon />
            )}

            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleOAuthLogin}
              style={{ width: '100%' }}
            >
              {loading ? '認証中...' : 'ログイン'}
            </Button>
          </Space>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            このアプリは安全なOAuth認証を使用してMastodonにアクセスします
          </Text>
        </Space>
      </Card>
    </Flex>
  )
}

export default App
