#!/usr/bin/env node

const { execSync } = require('child_process')

class ThingsManager {
  // Execute AppleScript command
  runAppleScript(script) {
    try {
      const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
        encoding: 'utf8'
      })
      return result.trim()
    } catch (error) {
      console.error('AppleScript Error:', error.message)
      return null
    }
  }

  // List all areas
  async listAreas() {
    const script = `
      tell application "Things3"
        set areaList to {}
        repeat with a in areas
          set end of areaList to name of a
        end repeat
        set AppleScript's text item delimiters to linefeed
        return areaList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result) {
      const areas = result.split('\n').filter(a => a.trim())
      console.log(`\nFound ${areas.length} areas:\n`)
      areas.forEach(area => console.log(`  • ${area}`))
    }
  }

  // List all projects
  async listProjects(areaName = null) {
    let script
    if (areaName) {
      script = `
        tell application "Things3"
          set projectList to {}
          repeat with p in projects of area "${areaName}"
            set end of projectList to name of p
          end repeat
          set AppleScript's text item delimiters to linefeed
          return projectList as text
        end tell
      `
    } else {
      script = `
        tell application "Things3"
          set projectList to {}
          repeat with p in projects
            set projectInfo to name of p
            try
              set areaName to name of area of p
              set projectInfo to projectInfo & " (" & areaName & ")"
            end try
            set end of projectList to projectInfo
          end repeat
          set AppleScript's text item delimiters to linefeed
          return projectList as text
        end tell
      `
    }

    const result = this.runAppleScript(script)
    if (result) {
      const projects = result.split('\n').filter(p => p.trim())
      const header = areaName ? `\nProjects in "${areaName}":\n` : `\nFound ${projects.length} projects:\n`
      console.log(header)
      projects.forEach(project => console.log(`  • ${project}`))
    }
  }

  // List all tags
  async listTags() {
    const script = `
      tell application "Things3"
        set tagList to {}
        repeat with t in tags
          set end of tagList to name of t
        end repeat
        set AppleScript's text item delimiters to linefeed
        return tagList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result) {
      const tags = result.split('\n').filter(t => t.trim())
      console.log(`\nFound ${tags.length} tags:\n`)
      tags.forEach(tag => console.log(`  • ${tag}`))
    }
  }

  // Show tasks from a specific list
  async showList(listName) {
    const script = `
      tell application "Things3"
        set todoList to {}
        repeat with t in to dos of list "${listName}"
          set todoInfo to name of t
          try
            set todoNotes to notes of t
            if todoNotes is not "" then
              set todoInfo to todoInfo & " [has notes]"
            end if
          end try
          set end of todoList to todoInfo
        end repeat
        set AppleScript's text item delimiters to linefeed
        return todoList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && result !== '') {
      const todos = result.split('\n').filter(t => t.trim())
      console.log(`\n${listName} (${todos.length} tasks):\n`)
      todos.forEach(todo => console.log(`  ☐ ${todo}`))
    } else {
      console.log(`\n${listName} is empty`)
    }
  }

  // Add a new task
  async addTask(name, options = {}) {
    let script = `tell application "Things3"\n`

    // Build properties object
    const properties = [`name:"${name}"`]

    if (options.notes) {
      properties.push(`notes:"${options.notes}"`)
    }

    if (options.dueDate) {
      properties.push(`due date:date "${options.dueDate}"`)
    }

    if (options.tags && options.tags.length > 0) {
      const tagNames = options.tags.join(', ')
      properties.push(`tag names:"${tagNames}"`)
    }

    // Create the todo
    script += `  set newTodo to make new to do with properties {${properties.join(', ')}}\n`

    // Move to project or area if specified
    if (options.project) {
      script += `  move newTodo to project "${options.project}"\n`
    } else if (options.area) {
      script += `  move newTodo to area "${options.area}"\n`
    }

    // Handle scheduling
    if (options.list) {
      script += `  move newTodo to list "${options.list}"\n`
    }

    script += `  return name of newTodo\nend tell`

    const result = this.runAppleScript(script)
    if (result) {
      console.log(`✓ Added task: ${result}`)
      if (options.project) console.log(`  → Project: ${options.project}`)
      if (options.area) console.log(`  → Area: ${options.area}`)
      if (options.list) console.log(`  → List: ${options.list}`)
      if (options.tags) console.log(`  → Tags: ${options.tags.join(', ')}`)
    }
  }

  // Search for tasks
  async search(query) {
    const script = `
      tell application "Things3"
        set todoList to {}
        repeat with t in to dos
          set todoName to name of t
          if todoName contains "${query}" then
            set todoInfo to todoName

            try
              set projectName to name of project of t
              set todoInfo to todoInfo & " [" & projectName & "]"
            end try

            try
              set areaName to name of area of t
              set todoInfo to todoInfo & " (" & areaName & ")"
            end try

            set end of todoList to todoInfo
          end if
        end repeat
        set AppleScript's text item delimiters to linefeed
        return todoList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && result !== '') {
      const todos = result.split('\n').filter(t => t.trim())
      console.log(`\nFound ${todos.length} tasks matching "${query}":\n`)
      todos.forEach(todo => console.log(`  ☐ ${todo}`))
    } else {
      console.log(`\nNo tasks found matching "${query}"`)
    }
  }

  // Show tasks in a project
  async showProject(projectName) {
    const script = `
      tell application "Things3"
        set todoList to {}
        repeat with t in to dos of project "${projectName}"
          set todoInfo to name of t
          try
            set todoNotes to notes of t
            if todoNotes is not "" then
              set todoInfo to todoInfo & " [has notes]"
            end if
          end try
          set end of todoList to todoInfo
        end repeat
        set AppleScript's text item delimiters to linefeed
        return todoList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && result !== '') {
      const todos = result.split('\n').filter(t => t.trim())
      console.log(`\nProject "${projectName}" (${todos.length} tasks):\n`)
      todos.forEach(todo => console.log(`  ☐ ${todo}`))
    } else {
      console.log(`\nProject "${projectName}" is empty or not found`)
    }
  }

  // Show tasks in an area
  async showArea(areaName) {
    const script = `
      tell application "Things3"
        set todoList to {}
        repeat with t in to dos of area "${areaName}"
          set todoInfo to name of t
          try
            set projectName to name of project of t
            set todoInfo to todoInfo & " [" & projectName & "]"
          end try
          set end of todoList to todoInfo
        end repeat
        set AppleScript's text item delimiters to linefeed
        return todoList as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && result !== '') {
      const todos = result.split('\n').filter(t => t.trim())
      console.log(`\nArea "${areaName}" (${todos.length} tasks):\n`)
      todos.forEach(todo => console.log(`  ☐ ${todo}`))
    } else {
      console.log(`\nArea "${areaName}" is empty or not found`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const manager = new ThingsManager()

  switch (command) {
    case 'list-areas':
      await manager.listAreas()
      break

    case 'list-projects':
      if (args[1]) {
        await manager.listProjects(args[1])
      } else {
        await manager.listProjects()
      }
      break

    case 'list-tags':
      await manager.listTags()
      break

    case 'show-today':
      await manager.showList('Today')
      break

    case 'show-upcoming':
      await manager.showList('Upcoming')
      break

    case 'show-inbox':
      await manager.showList('Inbox')
      break

    case 'show-anytime':
      await manager.showList('Anytime')
      break

    case 'show-someday':
      await manager.showList('Someday')
      break

    case 'show-project':
      if (args[1]) {
        await manager.showProject(args[1])
      } else {
        console.log('Usage: things-cli show-project <project-name>')
      }
      break

    case 'show-area':
      if (args[1]) {
        await manager.showArea(args[1])
      } else {
        console.log('Usage: things-cli show-area <area-name>')
      }
      break

    case 'add':
      if (args[1]) {
        const name = args[1]
        const options = {}

        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--notes' && args[i + 1]) {
            options.notes = args[i + 1]
            i++
          } else if (args[i] === '--project' && args[i + 1]) {
            options.project = args[i + 1]
            i++
          } else if (args[i] === '--area' && args[i + 1]) {
            options.area = args[i + 1]
            i++
          } else if (args[i] === '--tags' && args[i + 1]) {
            options.tags = args[i + 1].split(',').map(t => t.trim())
            i++
          } else if (args[i] === '--list' && args[i + 1]) {
            options.list = args[i + 1]
            i++
          } else if (args[i] === '--due' && args[i + 1]) {
            options.dueDate = args[i + 1]
            i++
          }
        }

        await manager.addTask(name, options)
      } else {
        console.log('Usage: things-cli add <task-name> [options]')
      }
      break

    case 'search':
      if (args[1]) {
        await manager.search(args[1])
      } else {
        console.log('Usage: things-cli search <query>')
      }
      break

    default:
      console.log(`
Things CLI Tool

Usage:
  things-cli list-areas                          - List all areas
  things-cli list-projects [area-name]           - List all projects (optionally filtered by area)
  things-cli list-tags                           - List all tags
  things-cli show-today                          - Show today's tasks
  things-cli show-upcoming                       - Show upcoming tasks
  things-cli show-inbox                          - Show inbox tasks
  things-cli show-anytime                        - Show anytime tasks
  things-cli show-someday                        - Show someday tasks
  things-cli show-project <project-name>         - Show tasks in a project
  things-cli show-area <area-name>               - Show tasks in an area
  things-cli add <task-name> [options]           - Add a new task
  things-cli search <query>                      - Search for tasks

Add Task Options:
  --notes "Note text"          Add notes to the task
  --project "Project Name"     Add task to a specific project
  --area "Area Name"           Add task to a specific area
  --tags "tag1, tag2"          Add comma-separated tags
  --list "List Name"           Move task to specific list (Today, Upcoming, Anytime, Someday)
  --due "YYYY-MM-DD"           Set due date

Examples:
  things-cli list-areas
  things-cli list-projects "Personal"
  things-cli show-today
  things-cli add "Review PR" --project "Development" --tags "code review"
  things-cli add "Call dentist" --list "Today" --notes "Schedule cleaning"
  things-cli search "meeting"
  things-cli show-project "Website Redesign"
      `)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = ThingsManager
