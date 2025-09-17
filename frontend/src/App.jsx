import { useState, useEffect } from 'react'
import { Search, Copy, ExternalLink, Package, ChevronLeft, ChevronRight, Loader2, Eye, X } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import './App.css'

dayjs.extend(relativeTime)

function App() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedServer, setSelectedServer] = useState(null)
  const [serverDetails, setServerDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const fetchServers = async (page = 1, search = '') => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '5'
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`http://localhost:8000/api/servers?${params}`)
      const data = await response.json()
      
      setServers(data.servers)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching servers:', error)
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchServers(1, searchQuery)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    fetchServers(newPage, searchQuery)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const fetchServerDetails = async (serverId) => {
    try {
      setDetailsLoading(true)
      const response = await fetch(`http://localhost:8000/api/servers/${serverId}`)
      const data = await response.json()
      setServerDetails(data)
    } catch (error) {
      console.error('Error fetching server details:', error)
    } finally {
      setDetailsLoading(false)
    }
  }

  const openServerDetails = (server) => {
    setSelectedServer(server)
    const serverId = server._meta?.['io.modelcontextprotocol.registry/official']?.id
    if (serverId) {
      fetchServerDetails(serverId)
    }
  }

  const closeServerDetails = () => {
    setSelectedServer(null)
    setServerDetails(null)
  }

  const getInstallCommand = (server) => {
    if (server.packages && server.packages.length > 0) {
      const pkg = server.packages[0]
      if (pkg.registry_type === 'npm') {
        return `npm install ${pkg.identifier}`
      } else if (pkg.registry_type === 'pypi') {
        return `pip install ${pkg.identifier}`
      }
    }
    return server.name
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <Package className="logo-icon" />
              <h1>MCP Registry</h1>
            </div>
            <p className="subtitle">Discover and explore Model Context Protocol servers</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search MCP servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <button type="submit" className="search-button" disabled={searchLoading}>
                {searchLoading ? <Loader2 className="spinner" /> : 'Search'}
              </button>
            </form>
          </div>

          <div className="servers-section">
            {loading ? (
              <div className="loading">
                <Loader2 className="spinner" />
                <p>Loading MCP servers...</p>
              </div>
            ) : (
              <>
                <div className="servers-grid">
                  {servers.map((server, index) => (
                    <div key={server._meta?.['io.modelcontextprotocol.registry/official']?.id || `server-${index}`} className="server-card">
                      <div className="server-header">
                        <h3 className="server-name">{server.name}</h3>
                        <div className="server-actions">
                          <button
                            onClick={() => openServerDetails(server)}
                            className="action-button"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => copyToClipboard(getInstallCommand(server))}
                            className="action-button"
                            title="Copy install command"
                          >
                            <Copy size={16} />
                          </button>
                          {server.repository_url && (
                            <a
                              href={server.repository_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-button"
                              title="View repository"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <p className="server-description">{server.description}</p>
                      
                      <div className="server-meta">
                        <span className="version">v{server.version}</span>
                        <span className="status">{server.status}</span>
                      </div>
                      
                      {server.packages && server.packages.length > 0 && (
                        <div className="packages">
                          {server.packages.map((pkg, index) => (
                            <span key={index} className="package-tag">
                              {pkg.registry_type}: {pkg.identifier}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {pagination.total_pages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!pagination.has_prev}
                      className="pagination-button"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    
                    <span className="pagination-info">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!pagination.has_next}
                      className="pagination-button"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Made with ❤️ by <a href="https://aianytime.net" target="_blank" rel="noopener noreferrer">AI Anytime</a></p>
        </div>
      </footer>

      {/* Server Details Modal */}
      {selectedServer && (
        <div className="modal-overlay" onClick={closeServerDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                {serverDetails?._meta?.['io.modelcontextprotocol.registry/official'] && (
                  <div className="timestamp-info">
                    {serverDetails._meta['io.modelcontextprotocol.registry/official'].updated_at && (
                      <span>Updated {dayjs(serverDetails._meta['io.modelcontextprotocol.registry/official'].updated_at).fromNow()}</span>
                    )}
                    {serverDetails._meta['io.modelcontextprotocol.registry/official'].updated_at && 
                     serverDetails._meta['io.modelcontextprotocol.registry/official'].published_at && ' • '}
                    {serverDetails._meta['io.modelcontextprotocol.registry/official'].published_at && (
                      <span>Published {dayjs(serverDetails._meta['io.modelcontextprotocol.registry/official'].published_at).fromNow()}</span>
                    )}
                  </div>
                )}
                <h2>{selectedServer.name}</h2>
                <div className="header-badges">
                  {serverDetails?.version && (
                    <span className="version-badge">v{serverDetails.version}</span>
                  )}
                  {serverDetails?.status && (
                    <span className={`status-badge ${serverDetails.status === 'deprecated' ? 'deprecated' : 'active'}`}>
                      {serverDetails.status}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeServerDetails} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {detailsLoading ? (
                <div className="modal-loading">
                  <Loader2 className="spinner" />
                  <p>Loading server details...</p>
                </div>
              ) : serverDetails ? (
                <div className="server-details">
                  <div className="detail-section">
                    <p className="description">{serverDetails.description || 'No description available'}</p>
                    
                    {serverDetails.repository?.url && (
                      <div className="repository-section">
                        <span className="repository-label">Repository:</span>
                        <a 
                          href={serverDetails.repository.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="repository-url"
                        >
                          {serverDetails.repository.url}
                        </a>
                      </div>
                    )}
                  </div>

                  {serverDetails.packages && serverDetails.packages.length > 0 && (
                    <div className="detail-section">
                      <h3>Packages</h3>
                      <div className="packages-list">
                        {serverDetails.packages.map((pkg, index) => (
                          <div key={index} className="package-item-detailed">
                            <div className="package-header">
                              <span className="package-registry">{pkg.registry_type}</span>
                              <span className="package-type">{pkg.type || 'stdio'}</span>
                            </div>
                            <div className="package-name-section">
                              <span className="package-name">{pkg.identifier}</span>
                              {pkg.version && <span className="package-version">v{pkg.version}</span>}
                            </div>
                            {(pkg.command || pkg.args) && (
                              <div className="package-command">
                                <pre>{JSON.stringify({
                                  type: pkg.type || 'stdio',
                                  command: pkg.command || 'npx',
                                  args: pkg.args || ['-y', `${pkg.identifier}${pkg.version ? `@${pkg.version}` : ''}`]
                                }, null, 2)}</pre>
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify({
                                    type: pkg.type || 'stdio',
                                    command: pkg.command || 'npx',
                                    args: pkg.args || ['-y', `${pkg.identifier}${pkg.version ? `@${pkg.version}` : ''}`]
                                  }, null, 2))}
                                  className="copy-command-btn"
                                  title="Copy configuration"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {serverDetails.remotes && serverDetails.remotes.length > 0 && (
                    <div className="detail-section">
                      <h3>Remotes</h3>
                      <div className="remotes-list">
                        {serverDetails.remotes.map((remote, index) => (
                          <div key={index} className="remote-item">
                            <div className="remote-header">
                              <span className="remote-type">{remote.type}</span>
                            </div>
                            <div className="remote-config">
                              <pre>{JSON.stringify(remote, null, 2)}</pre>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(remote, null, 2))}
                                className="copy-command-btn"
                                title="Copy remote configuration"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p>Failed to load server details</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
