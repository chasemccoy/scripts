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

  // Create a new project
  async createProject(name, options = {}) {
    let script = `tell application "Things3"\n`

    // Build properties object
    const properties = [`name:"${name}"`]

    if (options.notes) {
      properties.push(`notes:"${options.notes}"`)
    }

    // Create the project
    script += `  set newProject to make new project with properties {${properties.join(', ')}}\n`

    // Move to area if specified
    if (options.area) {
      script += `  move newProject to area "${options.area}"\n`
    }

    script += `  return name of newProject\nend tell`

    const result = this.runAppleScript(script)
    if (result) {
      console.log(`✓ Created project: ${result}`)
      if (options.area) console.log(`  → Area: ${options.area}`)
      return result
    }
    return null
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

    // Create the todo in the appropriate container
    if (options.project) {
      script += `  tell project "${options.project}"\n`
      script += `    set newTodo to make new to do with properties {${properties.join(', ')}}\n`
      script += `  end tell\n`
    } else if (options.area) {
      script += `  tell area "${options.area}"\n`
      script += `    set newTodo to make new to do with properties {${properties.join(', ')}}\n`
      script += `  end tell\n`
    } else {
      script += `  set newTodo to make new to do with properties {${properties.join(', ')}}\n`
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

  // Delete a task by name
  async deleteTask(taskName) {
    const script = `
      tell application "Things3"
        set allTodos to (get to dos)
        set deletedCount to 0

        repeat with t in allTodos
          try
            if name of t is "${taskName}" then
              delete t
              set deletedCount to deletedCount + 1
            end if
          end try
        end repeat

        return deletedCount as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && parseInt(result) > 0) {
      console.log(`✓ Deleted ${result} task(s) named: ${taskName}`)
    } else {
      console.log(`✗ No tasks found with name: ${taskName}`)
    }
  }

  // Move a task to a specific list
  async moveTask(taskName, listName) {
    const script = `
      tell application "Things3"
        set allTodos to (get to dos)
        set movedCount to 0

        repeat with t in allTodos
          try
            if name of t is "${taskName}" then
              move t to list "${listName}"
              set movedCount to movedCount + 1
            end if
          end try
        end repeat

        return movedCount as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && parseInt(result) > 0) {
      console.log(`✓ Moved ${result} task(s) named "${taskName}" to ${listName}`)
    } else {
      console.log(`✗ No tasks found with name: ${taskName}`)
    }
  }

  // Delete a project by name
  async deleteProject(projectName) {
    const script = `
      tell application "Things3"
        set allProjects to (get projects)
        set deletedCount to 0

        repeat with p in allProjects
          try
            if name of p is "${projectName}" then
              delete p
              set deletedCount to deletedCount + 1
            end if
          end try
        end repeat

        return deletedCount as text
      end tell
    `

    const result = this.runAppleScript(script)
    if (result && parseInt(result) > 0) {
      console.log(`✓ Deleted ${result} project(s) named: ${projectName}`)
    } else {
      console.log(`✗ No projects found with name: ${projectName}`)
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

    case 'create-project':
      if (args[1]) {
        const name = args[1]
        const options = {}

        for (let i = 2; i < args.length; i++) {
          if (args[i] === '--notes' && args[i + 1]) {
            options.notes = args[i + 1]
            i++
          } else if (args[i] === '--area' && args[i + 1]) {
            options.area = args[i + 1]
            i++
          }
        }

        await manager.createProject(name, options)
      } else {
        console.log('Usage: things-cli create-project <project-name> [options]')
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

    case 'delete':
      if (args[1]) {
        await manager.deleteTask(args[1])
      } else {
        console.log('Usage: things-cli delete <task-name>')
      }
      break

    case 'move':
      if (args[1] && args[2]) {
        await manager.moveTask(args[1], args[2])
      } else {
        console.log('Usage: things-cli move <task-name> <list-name>')
        console.log('List names: Today, Upcoming, Anytime, Someday, Inbox')
      }
      break

    case 'delete-project':
      if (args[1]) {
        await manager.deleteProject(args[1])
      } else {
        console.log('Usage: things-cli delete-project <project-name>')
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
  things-cli create-project <project-name> [options] - Create a new project
  things-cli add <task-name> [options]           - Add a new task
  things-cli search <query>                      - Search for tasks
  things-cli delete <task-name>                  - Delete a task by exact name

Create Project Options:
  --notes "Note text"          Add notes to the project
  --area "Area Name"           Add project to a specific area

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
  things-cli create-project "Website Redesign" --area "Work"
  things-cli add "Review PR" --project "Development" --tags "code review"
  things-cli add "Call dentist" --list "Today" --notes "Schedule cleaning"
  things-cli search "meeting"
  things-cli show-project "Website Redesign"
  things-cli delete "Optometry appointment"
      `)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = ThingsManager
