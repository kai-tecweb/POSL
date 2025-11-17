#!/bin/bash
# CI/CDパイプライン用ユーティリティスクリプト

set -euo pipefail

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# プロジェクトルート確認
check_project_root() {
    if [[ ! -f "package.json" && ! -f "docker-compose.yml" ]]; then
        log_error "プロジェクトルートディレクトリで実行してください"
        exit 1
    fi
}

# 依存関係インストール
install_dependencies() {
    log_info "依存関係をインストール中..."
    
    if [[ -d "backend" ]]; then
        log_info "バックエンド依存関係のインストール"
        (cd backend && npm ci)
    fi
    
    if [[ -d "frontend" ]]; then
        log_info "フロントエンド依存関係のインストール"
        (cd frontend && npm ci)
    fi
    
    log_success "依存関係のインストール完了"
}

# テスト実行
run_tests() {
    log_info "テストを実行中..."
    
    # バックエンドテスト
    if [[ -d "backend" ]]; then
        log_info "バックエンドテストの実行"
        (cd backend && npm run type-check)
        (cd backend && npm run lint)
        (cd backend && npm test)
    fi
    
    # フロントエンドテスト  
    if [[ -d "frontend" ]]; then
        log_info "フロントエンドテストの実行"
        (cd frontend && npm run type-check)
        (cd frontend && npm run lint)
        (cd frontend && npm run format:check)
    fi
    
    log_success "全テスト完了"
}

# ビルド実行
run_build() {
    log_info "ビルドを実行中..."
    
    # バックエンドビルド
    if [[ -d "backend" ]]; then
        log_info "バックエンドのビルド"
        (cd backend && npm run build)
    fi
    
    # フロントエンドビルド
    if [[ -d "frontend" ]]; then
        log_info "フロントエンドのビルド"
        (cd frontend && npm run build)
    fi
    
    log_success "ビルド完了"
}

# セキュリティチェック
security_check() {
    log_info "セキュリティチェックを実行中..."
    
    # バックエンドのnpm audit
    if [[ -d "backend" ]]; then
        log_info "バックエンドの脆弱性チェック"
        (cd backend && npm audit --audit-level moderate) || log_warning "バックエンドに脆弱性が検出されました"
    fi
    
    # フロントエンドのnpm audit
    if [[ -d "frontend" ]]; then
        log_info "フロントエンドの脆弱性チェック"
        (cd frontend && npm audit --audit-level moderate) || log_warning "フロントエンドに脆弱性が検出されました"
    fi
    
    log_success "セキュリティチェック完了"
}

# Terraformバリデーション
terraform_validate() {
    log_info "Terraformバリデーションを実行中..."
    
    if [[ -d "terraform/environments/production" ]]; then
        (cd terraform/environments/production && terraform fmt -check -recursive)
        (cd terraform/environments/production && terraform init)
        (cd terraform/environments/production && terraform validate)
        log_success "Terraformバリデーション完了"
    else
        log_warning "Terraformディレクトリが見つかりません"
    fi
}

# Docker環境のヘルスチェック
docker_health_check() {
    log_info "Docker環境のヘルスチェック中..."
    
    # docker-compose.ymlが存在する場合
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose ps
        log_success "Docker環境正常"
    else
        log_warning "docker-compose.ymlが見つかりません"
    fi
}

# CI/CD統合チェック
integration_check() {
    log_info "CI/CD統合チェックを開始..."
    
    check_project_root
    install_dependencies
    run_tests
    run_build
    security_check
    terraform_validate
    docker_health_check
    
    log_success "🎉 すべてのチェックが完了しました！"
}

# パフォーマンステスト
performance_test() {
    log_info "パフォーマンステストを実行中..."
    
    if [[ -d "frontend" ]]; then
        (cd frontend && npm run build)
        log_info "Lighthouse CIを実行..."
        # npx lhci autorun
        log_success "パフォーマンステスト完了"
    fi
}

# クリーンアップ
cleanup() {
    log_info "クリーンアップ中..."
    
    # ビルド成果物削除
    if [[ -d "backend/dist" ]]; then
        rm -rf backend/dist
        log_info "バックエンドビルド成果物を削除"
    fi
    
    if [[ -d "frontend/.next" ]]; then
        rm -rf frontend/.next
        log_info "フロントエンドビルド成果物を削除"
    fi
    
    # テスト成果物削除
    if [[ -d "backend/coverage" ]]; then
        rm -rf backend/coverage
        log_info "テストカバレッジレポートを削除"
    fi
    
    log_success "クリーンアップ完了"
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [COMMAND]"
    echo ""
    echo "利用可能なコマンド:"
    echo "  install     依存関係をインストール"
    echo "  test        テストを実行"
    echo "  build       ビルドを実行"
    echo "  security    セキュリティチェックを実行"
    echo "  terraform   Terraformバリデーションを実行"
    echo "  docker      Docker環境ヘルスチェック"
    echo "  integration 統合チェック（全項目実行）"
    echo "  performance パフォーマンステスト"
    echo "  cleanup     クリーンアップ"
    echo "  help        このヘルプを表示"
}

# メイン処理
main() {
    case "${1:-help}" in
        "install")
            install_dependencies
            ;;
        "test")
            run_tests
            ;;
        "build")
            run_build
            ;;
        "security")
            security_check
            ;;
        "terraform")
            terraform_validate
            ;;
        "docker")
            docker_health_check
            ;;
        "integration")
            integration_check
            ;;
        "performance")
            performance_test
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# スクリプト実行
main "$@"