# GitHub Pages 部署指南

## 第一步：安装 Git

1. 访问 https://gitforwindows.org/ 下载安装包
2. 运行安装程序，全程默认选项即可

## 第二步：在 GitHub 创建仓库

1. 登录 https://github.com
2. 点击右上角 `+` → `New repository`
3. 填写仓库名称（如 `blog`）
4. **不要**勾选任何初始化选项
5. 点击 `Create repository`

## 第三步：初始化并推送

打开 PowerShell，执行以下命令：

```powershell
cd D:\Administrator\Documents\blog

# 配置 Git
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱"

# 初始化仓库
git init
git add .
git commit -m "Initial commit"

# 关联远程仓库（把下面的 URL 换成你在 GitHub 创建的仓库地址）
git remote add origin https://github.com/你的用户名/blog.git

# 推送
git branch -M main
git push -u origin main
```

## 第四步：启用 GitHub Pages

1. 在 GitHub 仓库页面，点击 `Settings`
2. 左侧菜单找到 `Pages`
3. `Source` 选择 `Deploy from a branch`
4. `Branch` 选择 `main`，文件夹选 `/ (root)`
5. 点击 `Save`
6. 等待 1-2 分钟，你的博客就可以通过 `https://你的用户名.github.io/blog` 访问了

## 重要提醒

- 如果想用自定义域名，在 Pages 设置中添加 CNAME 文件即可
- 每次更新博客内容后，执行 `git add .` → `git commit -m "更新内容"` → `git push` 即可
