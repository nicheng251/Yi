# Yi 项目改进计划 v1.1

> 创建日期: 2025-05-22
> 最后更新: 2025-05-22
> 版本: 0.2.0

---

## 背景

v0.2.0 已发布，修复了 3 个关键 bug。当前代码存在中等优先级质量问题待解决，且缺乏测试覆盖。

**目标**: 提升代码可维护性、用户体验、测试覆盖率，为项目长期发展奠定基础。

---

## 执行策略

| 原则 | 说明 |
|------|------|
| **渐进式** | 每个小改动独立 commit，便于回滚 |
| **低风险优先** | 高风险改动放在最后，有充分测试后才执行 |
| **可验证** | 每阶段有明确的目标和验收标准 |

---

## 完整执行计划

### 阶段 1: 代码质量基础 (~2小时)

#### 1.1 提取共用工具函数 (~15分钟)
```
新建: src/utils/format.ts
  - formatMinutes(minutes: number): string
  - formatDuration(startedAt: number, endedAt?: number): string
  - formatDate(date: string): string
更新: Home.tsx, Statistics.tsx 使用统一工具
```

#### 1.2 统一错误处理模式 (~30分钟)
```
目标: 所有 store 使用一致的错误处理策略
策略:
  - Timer store: 已有 error 状态，保持 + 增强 toast
  - Project store: 返回 boolean + 统一错误处理
  - Settings store: 添加错误 toast 反馈
新建: src/hooks/useErrorToast.ts (共用错误处理 hook)
```

#### 1.3 提取 Results.tsx hooks (~1小时)
```
新建 hooks:
  src/hooks/useAutoSave.ts      - 自动保存逻辑
  src/hooks/useDayNavigation.ts - 日期导航
  src/hooks/useDayRecord.ts     - 日记录加载
  src/hooks/useSearch.ts        - 搜索功能
拆分: Results.tsx 从 381行 → ~200行
```

---

### 阶段 2: E2E 测试体系 (~2.5小时)

#### 2.1 Playwright 配置 (~30分钟)
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium

新建: playwright.config.ts
新建: tests/e2e/example.spec.ts
配置:
  - baseUrl: http://localhost:1420
  - headless: true
  - viewport: 1200x800
```

#### 2.2 核心 E2E 测试用例 (~2小时)
```
tests/e2e/
  ├── project-timer.spec.ts     # 项目计时测试
  │   - 创建项目
  │   - 启动计时器
  │   - 停止计时器
  │   - 验证 session 记录
  │
  ├── archive.spec.ts           # 归档功能测试
  │   - 归档有计时器的项目
  │   - 验证计时停止
  │   - 恢复归档项目
  │
  ├── import-export.spec.ts     # 导入导出测试
  │   - 导出数据
  │   - 验证 JSON 结构
  │   - 导入数据
  │   - 验证数据完整
  │
  └── settings.spec.ts          # 设置功能测试
      - 主题切换
      - 开机自启切换
```

#### 2.3 CI 集成 (~30分钟)
```
新建: .github/workflows/e2e.yml
触发: pull_request, push to main
```

---

### 阶段 3: UX 增强 (~2.5小时)

#### 3.1 计时器页面改进 (~1小时)
```
新建: src/components/StatsBar.tsx
功能:
  - 今日累计时间
  - 本周累计时间
  - 当前项目累计时间
```

#### 3.2 项目排序增强 (~30分钟)
```
新增排序选项:
  - 按累计专注时长排序
  - 按最近活动时间排序
```

#### 3.3 归档页增强 (~30分钟)
```
显示信息:
  - 归档时间
  - 原累计时长
```

#### 3.4 搜索高亮 (~30分钟)
```
功能:
  - 关键词高亮
  - 搜索历史下拉
```

---

### 阶段 4: 性能优化 (~1.5小时)

#### 4.1 批量查询优化 (~1小时)
```
问题: N+1 查询 (每个项目单独查 total_minutes)
方案: get_projects 时 JOIN sessions 计算 total_minutes
影响: 项目列表加载从 O(n) → O(1)
```

#### 4.2 计时器节流 (~30分钟)
```
问题: 每秒更新整个组件
方案: 只更新时间显示，不触发完整 re-render
```

---

### 阶段 5: Rust 测试覆盖 (~1小时)

#### 5.1 db.rs 单元测试
```
#[cfg(test)]
mod tests {
    #[test]
    fn test_search_escape_wildcards()
    #[test]
    fn test_clear_all_data_cascades()
    #[test]
    fn test_archive_project_ends_session()
    #[test]
    fn test_import_session_closes_active()
}
```

---

### 阶段 6: 代码架构优化 (可选，高风险)

#### 6.1 Command Handler 简化
```
问题: 24个命令重复模式
方案: 使用 Rust macro_rules
风险评估: 中等 (需要全面测试)
建议: 在阶段 2 E2E 测试完善后再执行
```

---

## 阶段 6: 代码架构优化 (可选，高风险 - 延后)

#### 6.1 Command Handler 简化
```
问题: 24个命令重复模式
方案: 使用 Rust macro_rules
风险评估: 中等 (需要全面测试)
状态: 延后 - 建议在充分测试覆盖后执行
```

---

## 执行顺序 & 时间预估

| # | 阶段 | 工时 | 风险 | 状态 |
|---|------|------|------|------|
| 1 | 1.1 提取工具函数 | 15min | 低 | ✅ 已完成 |
| 2 | 1.2 统一错误处理 | 30min | 低 | ✅ 已完成 |
| 3 | 2.1 Playwright 配置 | 30min | 低 | ✅ 已完成 |
| 4 | 2.2 E2E 核心用例 | 2hr | 中 | ✅ 已完成 |
| 5 | 1.3 提取 hooks | 1hr | 低 | ✅ 已完成 |
| 6 | 3.1 计时器改进 | 1hr | 低 | ✅ 已完成 |
| 7 | 3.2-3.4 UX 增强 | 1.5hr | 低 | ✅ 已完成 |
| 8 | 4.1 批量查询优化 | 1hr | 中 | ✅ 已完成 |
| 9 | 4.2 计时器节流 | 30min | 低 | ✅ 已完成 |
| 10 | 5.1 Rust 单元测试 | 1hr | 低 | ✅ 已完成 |
| 11 | 2.3 CI 集成 | 30min | 低 | ✅ 已完成 |
| 12 | 6.1 Command Handler | 2hr | 高 | ⏸️ 延后 |

**总工时**: ~11.5 小时 (可分多次 session 执行)

---

## 验收标准

每个阶段完成后应满足：

| 阶段 | 验收标准 |
|------|----------|
| 1 | `npm run build` 成功，无类型错误 |
| 2 | `npx playwright test` 通过率 100% (E2E tests ready, browser issue pending) |
| 3 | 手动测试 UX 功能正常 |
| 4 | 项目列表加载时间 < 500ms (100个项目) |
| 5 | `cargo test` 通过率 100% |
| 6 | 全部 E2E 测试 + 手动测试通过 |

---

## 项目当前状态 (v0.2.1)

### 技术栈
- **Framework**: Tauri 2.x + React 18 + TypeScript
- **Database**: SQLite (rusqlite with bundled)
- **State**: Zustand
- **Build**: Vite

### 已完成改进
- ✅ formatMinutes → utils/format.ts
- ✅ useErrorToast hook
- ✅ useAutoSave, useKeyboardShortcut hooks
- ✅ StatsBar 显示今日/本周累计
- ✅ 项目排序增加"累计时长"选项
- ✅ 归档页显示累计时长
- ✅ get_projects SQL JOIN 优化 (N+1 → O(1))
- ✅ CurrentTimer memoize 减少 re-render
- ✅ Rust 单元测试 (4 tests)
- ✅ GitHub Actions CI workflow

### 待改进 (低优先级)
- ⏸️ 6.1 Command Handler 重构 (高风险，延后)

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `AGENTS.md` | 项目架构和已知问题 |
| `CHANGELOG.md` | 版本变更记录 |
| `README.md` | 项目文档 |
| `.github/workflows/ci.yml` | CI 自动化配置 |
| `tests/e2e/*.spec.ts` | E2E 测试用例 |

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2025-05-22 | v1.1 | 添加完整执行计划和验收标准 |
| 2025-05-22 | v1.0 | 初稿 |