/*Copyright 2019-2021 Kirk McDonald

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/
import { Icon } from "./icon.js"
import { DisabledRecipe } from "./recipe.js"
import { Totals } from "./totals.js"

export class Item {
    constructor(key, name, col, row, phase, group, subgroup, order) {
        this.key = key
        this.name = name
        // XXX: Satisfactory cruft
        this.tier = 0
        this.phase = phase
        this.recipes = []
        this.uses = []

        this.icon_col = col
        this.icon_row = row
        this.icon = new Icon(this)

        this.group = group
        this.subgroup = subgroup
        this.order = order

        this.disableRecipe = new DisabledRecipe(this)
    }
    allRecipes() {
        return this.recipes.concat([this.disableRecipe])
    }
    addRecipe(recipe) {
        this.recipes.push(recipe)
    }
    addUse(recipe) {
        this.uses.push(recipe)
    }
    renderTooltip() {
        let self = this
        let t = d3.create("div")
            .classed("frame", true)
        let header = t.append("h3")
        header.append(() => self.icon.make(32, true))
        header.append(() => new Text(self.name))
        return t.node()
    }
}

export function getItems(data) {
    let items = new Map()
    //for (let d of data.items) {
    for (let key in data.items) {
        let d = data.items[key]
        if (!d.localized_name) {
            continue
        }
        let phase = (d.type === "fluid") ? "fluid" : "solid"
        items.set(d.name, new Item(
            d.name,
            d.localized_name.en,
            d.icon_col,
            d.icon_row,
            phase,
            d.group,
            d.subgroup,
            d.order,
        ))
    }
    let cycleKey = "nuclear-reactor-cycle"
    let reactor = data.items["nuclear-reactor"]
    items.set(cycleKey, new Item(
        cycleKey,
        "Nuclear reactor cycle",
        reactor.icon_col,
        reactor.icon_row,
        "abstract",
        "production",
        "energy",
        "f[nuclear-energy]-d[reactor-cycle]",
    ))
    return items
}
