# 9103codingInfiniteStarryNight
Creative coding major project (Final)
# Infinite Starry Night 🌌

## Project Overview

**Course:** Creative Coding  
**Artwork:** *The Starry Night* – Vincent van Gogh  
**Platform:** p5.js (JavaScript)

Our project reinterprets Van Gogh's *The Starry Night* as an interactive and dynamic artwork.

Through generative visuals, sound, and time-based changes, we aim to bring the painting to life and create an immersive experience.

Users can explore different layers of the artwork by zooming in, moving from the night sky into space and stars, creating a journey through interconnected worlds.

## Team Responsibilities

| Member / Branch | Main Responsibility |
|---|---|
| Yuan / `yuan` | Perlin Noise & Randomness + User Input (Zoom & Navigation) |
| Qingyang Fang / `audio` | Audio-based Interactions |
| Yang Wu / `time-based` | Time-based Effects & Transitions |

## GitHub 使用指南

### 1. 下载项目（第一次）

```bash
git clone https://github.com/oYuanKo/9103codingInfiniteStarryNight.git
cd 9103codingInfiniteStarryNight
```

### 2. 创建自己的 Branch（第一次）

```bash
git switch -c 自己的名字
git push -u origin 自己的名字
```

每个人在自己的 branch 开发，不要直接修改 `main`。

### 3. 开始写代码前（同步 main）

```bash
git switch main
git pull origin main
git switch 自己的名字
git merge main
```

### 4. 写完代码后（上传修改）

```bash
git add .
git commit -m "描述本次修改"
git push
```

### 5. 合并到 Main

在 GitHub 网站上创建 **Pull Request**：

`自己的 branch → main`

检查后点击 **Merge pull request**。

### Useful Commands

| Command | Description |
|---|---|
| `git branch` | 查看本地分支 |
| `git switch 分支名` | 切换分支 |
| `git status` | 查看修改状态 |
| `git pull` | 拉取当前分支的最新代码 |
| `git push` | 上传已提交的修改 |

## Notes

- Always work on your own branch.
- Pull and merge the latest `main` before starting new work.
- Keep individual features in separate `.js` files where possible.
- Use Pull Requests to merge completed features into `main`.
- Communicate before editing shared files such as `sketch.js`.

## Use of AI Statement:
ChatGPT (OpenAI) and Codex were used to improve code quality; help with difficult features;
