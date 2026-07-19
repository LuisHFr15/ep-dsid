import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Rede de segurança: sem isto, uma exceção no render desmonta a árvore inteira
// e o app fica com a tela preta. Aqui capturamos e mostramos uma mensagem
// legível com opção de recarregar.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro não capturado no render:', error, info)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold">Algo deu errado na tela</h1>
          <p className="max-w-md text-sm text-[var(--color-muted)]">
            {this.state.error.message || 'Ocorreu um erro inesperado ao renderizar esta parte do app.'}
          </p>
          <Button onClick={this.handleReload}>Recarregar</Button>
        </div>
      )
    }

    return this.props.children
  }
}
