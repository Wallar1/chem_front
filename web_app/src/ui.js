let ui_state = {
    'selected_compound': 'H2O',
}

function update_selected(event) {
    ui_state['selected_compound'] = event.target.innerText
    console.log(ui_state)
}

export {ui_state, update_selected};