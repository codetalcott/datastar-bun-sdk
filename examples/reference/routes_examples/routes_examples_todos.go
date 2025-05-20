package site

import (
	"fmt"
	"github.com/starfederation/datastar/sdk/go/datastar"
)

type TodoViewMode int

const (
	TodoViewModeAll TodoViewMode = iota
	TodoViewModeActive
	TodoViewModeCompleted
	TodoViewModeLast
)

var TodoViewModeStrings = []string{"All", "Active", "Completed"}

type Todo struct {
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type TodoMVC struct {
	Todos      []*Todo      `json:"todos"`
	EditingIdx int          `json:"editingIdx"`
	Mode       TodoViewMode `json:"mode"`
}

// TodosMVCView renders the TodoMVC component
func TodosMVCView(mvc *TodoMVC) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		hasTodos := len(mvc.Todos) > 0
		left, completed := 0, 0
		for _, todo := range mvc.Todos {
			if !todo.Completed {
				left++
			} else {
				completed++
			}
		}
		input := ""
		if mvc.EditingIdx >= 0 {
			input = mvc.Todos[mvc.EditingIdx].Text
		}

		return templ.Raw(`
<div id="todosMVC" class="w-full shadow-xl card bg-base-100 ring-4 ring-primary">
	<div class="card-body">
		<div
			class="flex flex-col w-full gap-4"
			data-signals="` + fmt.Sprintf("{input:'%s'}", input) + `"
		>
			<p class="text-sm">
				This mini application is driven by a
				<span class="italic font-bold uppercase text-primary">single get request!</span>
				As you interact with the UI, the backend state is updated and new partial HTML fragments are sent down to the client via Server-Sent Events.  You can make simple apps or full blown SPA replacements with this pattern.  Open your dev tools and watch the network tab to see the magic happen (you will want to look for the "/todos" Network/EventStream tab).
			</p>
			<section class="flex flex-col gap-2">
				<header class="flex flex-col gap-2">
					<div class="flex items-baseline gap-2">
						<h1 class="text-4xl font-bold uppercase font-brand md:text-6xl text-primary">todos</h1>
						<h3 class="text-lg">example</h3>
					</div>
					<h2 class="text-sm">
						The input is bound to a local signals, but this is not a single page application.  It is like having <a class="link-primary" href="https://htmx.org" target="_blank">HTMX</a> + <a class="link-primary" href="https://alpinejs.dev/" target="_blank">Alpine.js</a> but with just one API to learn and much easier to extend.
					</h2>
					<div class="flex items-center gap-2">` + func() string {
						if hasTodos {
							return `
						<div class="tooltip" data-tip="toggle all todos">
							<button
								id="toggleAll"
								class="btn btn-lg"
								data-on-click="` + datastar.PostSSE("/api/todos/-1/toggle") + `"
								data-testid="toggle_all_todos"
								data-indicator="toggleAllFetching"
								data-attrs-disabled="$toggleAllFetching"
							>
								<svg class="icon"><use xlink:href="#material-symbols:checklist"></use></svg>
							</button>
						</div>
						<div class="indicator">
							<span class="indicator-item badge badge-primary hidden" data-class-hidden="!$toggleAllFetching"></span>
							<span class="text-sm text-secondary">Processing...</span>
						</div>`
						}
						return ""
					}() + func() string {
						if mvc.EditingIdx < 0 {
							return TodoInput(-1).Render(ctx, w)
						}
						return ""
					}() + `
					</div>
				</header>` + func() string {
					if hasTodos {
						return `
				<section>
					<ul class="divide-y divide-primary" data-testid="todos_list">` + func() string {
							output := ""
							for i, todo := range mvc.Todos {
								output += TodoRow(mvc.Mode, todo, i, i == mvc.EditingIdx).Render(ctx, w)
							}
							return output
						}() + `
					</ul>
				</section>
				<footer class="flex flex-wrap items-center justify-between gap-2">
					<span class="todo-count">
						<strong data-testid="todo_count">
							` + fmt.Sprint(left) + ` ` + func() string {
							if (len(mvc.Todos) > 1) {
								return "items"
							} else {
								return "item"
							}
						}() + `
						</strong> left
					</span>
					<div class="join">` + func() string {
						output := ""
						for i := TodoViewModeAll; i < TodoViewModeLast; i++ {
							if i == mvc.Mode {
								output += `<div class="btn btn-xs btn-primary join-item" data-testid="` + TodoViewModeStrings[i] + `_mode">` + TodoViewModeStrings[i] + `</div>`
							} else {
								output += `<button
									class="btn btn-xs join-item"
									data-on-click="` + datastar.PutSSE("/api/todos/mode/%d", i) + `"
									data-testid="` + TodoViewModeStrings[i] + `_mode"
								>
									` + TodoViewModeStrings[i] + `
								</button>`
							}
						}
						return output
					}() + `
					</div>
					<div class="join">` + func() string {
						if completed > 0 {
							return `
						<div class="tooltip" data-tip="` + fmt.Sprintf("clear %d completed todos", completed) + `">
							<button
								class="btn btn-error btn-xs join-item"
								data-on-click="` + datastar.DeleteSSE("/api/todos/-1") + `"
								data-testid="clear_todos"
							>
								<svg class="icon"><use xlink:href="#material-symbols:delete"></use></svg>
							</button>
						</div>`
						}
						return ""
					}() + `
						<div class="tooltip" data-tip="Reset list">
							<button
								class="btn btn-warning btn-xs join-item"
								data-on-click="` + datastar.PutSSE("/api/todos/reset") + `"
								data-testid="reset_todos"
							>
								<svg class="icon"><use xlink:href="#material-symbols:delete-sweep"></use></svg>
							</button>
						</div>
					</div>
				</footer>
				<footer class="flex justify-center text-xs">
					<div>Click to edit, click away to cancel, press enter to save.</div>
				</footer>`
					}
					return ""
				}() + `
			</section>
		</div>
	</div>
</div>`)
	})
}

// TodoInput renders an input for creating/editing a todo
func TodoInput(i int) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		extraAttr := ""
		if i >= 0 {
			extraAttr = fmt.Sprintf(`data-on-click__outside="%s"`, datastar.PutSSE("/api/todos/cancel"))
		}
		
		return templ.Raw(`
<input
	id="todoInput"
	data-testid="todos_input"
	class="flex-1 w-full italic input input-bordered input-lg"
	placeholder="What needs to be done?"
	enterkeyhint="enter"
	data-bind-input
	data-on-keydown="` + fmt.Sprintf(`
		if (evt.key !== 'Enter' || !$input.trim().length) return;
		%s;
		$input = '';
	`, datastar.PutSSE("/api/todos/%d/edit", i)) + `"
	` + extraAttr + `
/>`)
	})
}

// TodoRow renders a single todo item
func TodoRow(mode TodoViewMode, todo *Todo, i int, isEditing bool) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		if isEditing {
			return TodoInput(i).Render(ctx, w)
		}
		
		if (mode == TodoViewModeAll) ||
			(mode == TodoViewModeActive && !todo.Completed) ||
			(mode == TodoViewModeCompleted && todo.Completed) {
			
			indicatorID := fmt.Sprintf("indicator%d", i)
			fetchingSignalName := fmt.Sprintf("fetching%d", i)
			
			checkboxIcon := `<svg class="icon"><use xlink:href="#material-symbols:check-box-outline-blank"></use></svg>`
			if todo.Completed {
				checkboxIcon = `<svg class="icon"><use xlink:href="#material-symbols:check-box-outline"></use></svg>`
			}
			
			return templ.Raw(`
<li class="flex items-center gap-8 p-1 p-2 group" id="` + fmt.Sprintf("todo%d", i) + `">
	<label
		id="` + fmt.Sprintf("toggle%d", i) + `"
		class="text-4xl cursor-pointer"
		data-on-click="` + datastar.PostSSE("/api/todos/%d/toggle", i) + `"
		data-indicator="` + fetchingSignalName + `"
	>
		` + checkboxIcon + `
	</label>
	<label
		id="` + indicatorID + `"
		class="flex-1 text-lg cursor-pointer select-none"
		data-on-click="` + datastar.GetSSE("/api/todos/%d/edit", i) + `"
		data-indicator="` + fetchingSignalName + `"
	>
		` + todo.Text + `
	</label>
	<div class="indicator">
		<span class="indicator-item badge badge-primary hidden" data-class-hidden="!$` + fetchingSignalName + `"></span>
		<span class="text-sm text-secondary">Processing...</span>
	</div>
	<button
		id="` + fmt.Sprintf("delete%d", i) + `"
		class="invisible btn btn-error group-hover:visible"
		data-on-click="` + datastar.DeleteSSE("/api/todos/%d", i) + `"
		data-testid="` + fmt.Sprintf("delete_todo%d", i) + `"
		data-indicator="` + fetchingSignalName + `"
		data-attrs-disabled="` + fetchingSignalName + `"
	>
		<svg class="icon"><use xlink:href="#material-symbols:close"></use></svg>
	</button>
</li>`)
		}
		
		return nil
	})
}

// Handler for todo API endpoints
func TodosHandler(w http.ResponseWriter, r *http.Request) {
	// This would contain the API handler implementation for the todos
	// including retrieving, adding, editing, toggling, and deleting todos
	// For simplicity, this is just a placeholder
	
	// Example structure:
	/*
	path := r.URL.Path
	
	// Get all todos
	if path == "/api/todos" && r.Method == "GET" {
		// Return all todos as SSE
		// Send TodosMVCView with current state
	}
	
	// Toggle a todo
	if strings.Contains(path, "/api/todos/") && strings.Contains(path, "/toggle") && r.Method == "POST" {
		// Toggle the todo and return updated view
	}
	
	// Edit mode for a todo
	if strings.Contains(path, "/api/todos/") && strings.Contains(path, "/edit") && r.Method == "GET" {
		// Enter edit mode for a todo
	}
	
	// Save edited todo
	if strings.Contains(path, "/api/todos/") && strings.Contains(path, "/edit") && r.Method == "PUT" {
		// Save the edited todo
	}
	
	// Cancel edit
	if path == "/api/todos/cancel" && r.Method == "PUT" {
		// Cancel editing
	}
	
	// Change view mode
	if strings.Contains(path, "/api/todos/mode/") && r.Method == "PUT" {
		// Change the view mode (All, Active, Completed)
	}
	
	// Delete a todo
	if strings.Contains(path, "/api/todos/") && r.Method == "DELETE" {
		// Delete the specified todo
	}
	
	// Reset todos
	if path == "/api/todos/reset" && r.Method == "PUT" {
		// Reset the todo list
	}
	*/
}