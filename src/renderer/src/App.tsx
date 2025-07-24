import React, { useState } from 'react'
import { Button, Input, Space, Typography, Card, Alert } from 'antd'

const { Title, Text } = Typography

function App(): React.JSX.Element {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      background: '#f5f5f5'
    }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2}>Mastodon クライアント</Title>
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
    </div>
  )
}

export default App
