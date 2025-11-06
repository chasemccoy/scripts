#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)

const POSTS_DIR = path.join(process.env.HOME, 'Repositories/www/posts')

class BlogManager {
  // Parse YAML frontmatter from markdown content
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (match) {
      const frontmatter = {}
      const lines = match[1].split('\n')

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':')
        if (key && valueParts.length > 0) {
          frontmatter[key.trim()] = valueParts.join(':').trim()
        }
      }

      return {
        frontmatter,
        content: match[2]
      }
    }

    return {
      frontmatter: {},
      content
    }
  }

  // Parse filename to extract date and slug
  parseFilename(filename) {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+?)(?:\.md)?$/)
    if (match) {
      return {
        date: match[1],
        slug: match[2]
      }
    }
    return null
  }

  // Get all posts (files and folders)
  async getAllPosts() {
    const entries = await readdir(POSTS_DIR)
    const posts = []

    for (const entry of entries) {
      if (entry === 'posts.json') continue

      const parsed = this.parseFilename(entry)
      if (!parsed) continue

      const fullPath = path.join(POSTS_DIR, entry)
      const stats = await stat(fullPath)

      let filePath
      if (stats.isDirectory()) {
        filePath = path.join(fullPath, 'index.md')
        if (!fs.existsSync(filePath)) continue
      } else if (entry.endsWith('.md')) {
        filePath = fullPath
      } else {
        continue
      }

      try {
        const content = await readFile(filePath, 'utf8')
        const { frontmatter } = this.parseFrontmatter(content)

        posts.push({
          date: parsed.date,
          slug: parsed.slug,
          title: frontmatter.title || null,
          filePath,
          isFolder: stats.isDirectory()
        })
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message)
      }
    }

    // Sort by date descending
    posts.sort((a, b) => b.date.localeCompare(a.date))
    return posts
  }

  // Find post by slug
  async findPostBySlug(slug) {
    const posts = await this.getAllPosts()
    return posts.find(p => p.slug === slug)
  }

  // List all posts
  async listPosts() {
    const posts = await this.getAllPosts()

    console.log(`\nFound ${posts.length} posts:\n`)
    for (const post of posts) {
      const title = post.title ? ` - ${post.title}` : ''
      const type = post.isFolder ? ' [folder]' : ''
      console.log(`${post.date} | ${post.slug}${title}${type}`)
    }
  }

  // Search posts
  async searchPosts(query) {
    const posts = await this.getAllPosts()
    const results = []

    for (const post of posts) {
      const searchIn = `${post.slug} ${post.title || ''}`.toLowerCase()

      if (searchIn.includes(query.toLowerCase())) {
        results.push(post)
        continue
      }

      try {
        const content = await readFile(post.filePath, 'utf8')
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push(post)
        }
      } catch (error) {
        console.error(`Error reading ${post.filePath}:`, error.message)
      }
    }

    console.log(`\nFound ${results.length} matching posts:\n`)
    for (const post of results) {
      const title = post.title ? ` - ${post.title}` : ''
      const type = post.isFolder ? ' [folder]' : ''
      console.log(`${post.date} | ${post.slug}${title}${type}`)
    }

    return results
  }

  // Get post content
  async getPost(slug) {
    const post = await this.findPostBySlug(slug)

    if (!post) {
      console.log(`Post not found: ${slug}`)
      return null
    }

    const content = await readFile(post.filePath, 'utf8')
    console.log(content)
    return content
  }

  // Create new post
  async createPost(slug, options = {}) {
    const date = options.date || new Date().toISOString().split('T')[0]
    const filename = `${date}-${slug}.md`
    const filePath = path.join(POSTS_DIR, filename)

    if (fs.existsSync(filePath)) {
      console.log(`Post already exists: ${filename}`)
      return null
    }

    let content = ''
    if (options.title) {
      content = `---\ntitle: ${options.title}\n---\n\n`
    }

    await writeFile(filePath, content, 'utf8')
    console.log(`Created post: ${filename}`)
    return filePath
  }

  // Edit post content
  async editPost(slug, newContent) {
    const post = await this.findPostBySlug(slug)

    if (!post) {
      console.log(`Post not found: ${slug}`)
      return null
    }

    const currentContent = await readFile(post.filePath, 'utf8')
    const { frontmatter } = this.parseFrontmatter(currentContent)

    let finalContent = newContent
    if (Object.keys(frontmatter).length > 0) {
      const frontmatterStr = Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
      finalContent = `---\n${frontmatterStr}\n---\n\n${newContent}`
    }

    await writeFile(post.filePath, finalContent, 'utf8')
    console.log(`Updated post: ${slug}`)
    return post.filePath
  }

  // Convert single file post to folder with index.md
  async convertToFolder(slug) {
    const post = await this.findPostBySlug(slug)

    if (!post) {
      console.log(`Post not found: ${slug}`)
      return null
    }

    if (post.isFolder) {
      console.log(`Post is already a folder: ${slug}`)
      return null
    }

    // Read the content from the .md file
    const content = await readFile(post.filePath, 'utf8')

    // Create folder name
    const folderName = `${post.date}-${post.slug}`
    const folderPath = path.join(POSTS_DIR, folderName)

    // Create the folder
    await mkdir(folderPath)

    // Write index.md inside the folder
    const indexPath = path.join(folderPath, 'index.md')
    await writeFile(indexPath, content, 'utf8')

    // Delete the original .md file
    await unlink(post.filePath)

    console.log(`Converted post to folder: ${folderName}/`)
    return folderPath
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const blogManager = new BlogManager()

  switch (command) {
    case 'list':
      await blogManager.listPosts()
      break

    case 'search':
      if (args[1]) {
        await blogManager.searchPosts(args[1])
      } else {
        console.log('Usage: blog-cli search <query>')
      }
      break

    case 'get':
      if (args[1]) {
        await blogManager.getPost(args[1])
      } else {
        console.log('Usage: blog-cli get <slug>')
      }
      break

    case 'create':
      if (args[1]) {
        const slug = args[1]
        const options = {}

        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--title' && args[i + 1]) {
            options.title = args[i + 1]
            i++
          } else if (args[i] === '--date' && args[i + 1]) {
            options.date = args[i + 1]
            i++
          }
        }

        await blogManager.createPost(slug, options)
      } else {
        console.log('Usage: blog-cli create <slug> [--title "Title"] [--date YYYY-MM-DD]')
      }
      break

    case 'edit':
      if (args[1] && args[2]) {
        const slug = args[1]
        const newContent = args.slice(2).join(' ')
        await blogManager.editPost(slug, newContent)
      } else {
        console.log('Usage: blog-cli edit <slug> <new-content>')
      }
      break

    case 'convert-to-folder':
      if (args[1]) {
        await blogManager.convertToFolder(args[1])
      } else {
        console.log('Usage: blog-cli convert-to-folder <slug>')
      }
      break

    default:
      console.log(`
Blog Post CLI Tool

Usage:
  blog-cli list                              - List all blog posts
  blog-cli search <query>                    - Search posts by slug, title, or content
  blog-cli get <slug>                        - Get content of specific post
  blog-cli create <slug> [options]           - Create a new post
  blog-cli edit <slug> <new-content>         - Edit existing post
  blog-cli convert-to-folder <slug>          - Convert single file to folder with index.md

Create Options:
  --title "Title"       Add a title to the frontmatter
  --date YYYY-MM-DD     Set a specific date (defaults to today)

Examples:
  blog-cli list
  blog-cli search "AI"
  blog-cli get "claude-code"
  blog-cli create "my-new-post" --title "My New Post"
  blog-cli edit "my-post" "Updated content here"
  blog-cli convert-to-folder "my-post"
      `)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = BlogManager
