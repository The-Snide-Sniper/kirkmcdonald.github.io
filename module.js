/*Copyright 2015-2024 Kirk McDonald

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
import { Rational, zero, one } from "./rational.js"
import { sorted } from "./sort.js"

class Module {
    constructor(key, name, col, row, category, order, productivity, speed, power, limit) {
        // Other module effects not modeled by this calculator.
        this.key = key
        this.name = name
        this.category = category
        this.order = order
        this.productivity = productivity
        this.speed = speed
        this.power = power
        this.limit = new Set(limit)

        this.icon_col = col
        this.icon_row = row
        this.icon = new Icon(this)
    }
    shortName() {
        return this.key[0] + this.key[this.key.length - 1]
    }
    canUse(recipe) {
        if (recipe.allModules()) {
            return true
        }
        //if (Object.keys(this.limit).length > 0) {
        if (this.limit.size > 0) {
            return this.limit.has(recipe.key)
        }
        return true
    }
    canBeacon() {
        return this.productivity.isZero()
    }
    hasProdEffect() {
        return !this.productivity.isZero()
    }
    /*renderTooltip() {
        var t = document.createElement("div")
        t.classList.add("frame")
        var title = document.createElement("h3")
        var im = getImage(this, true)
        title.appendChild(im)
        title.appendChild(new Text(formatName(this.name)))
        t.appendChild(title)
        var b
        var hundred = RationalFromFloat(100)
        var first = false
        if (!this.power.isZero()) {
            var power = this.power.mul(hundred)
            if (first) {
                t.appendChild(document.createElement("br"))
            } else {
                first = true
            }
            b = document.createElement("b")
            b.textContent = "Energy consumption: "
            t.appendChild(b)
            var sign = ""
            if (!this.power.less(zero)) {
                sign = "+"
            }
            t.appendChild(new Text(sign + power.toDecimal() + "%"))
        }
        if (!this.speed.isZero()) {
            var speed = this.speed.mul(hundred)
            if (first) {
                t.appendChild(document.createElement("br"))
            } else {
                first = true
            }
            b = document.createElement("b")
            b.textContent = "Speed: "
            t.appendChild(b)
            var sign = ""
            if (!this.speed.less(zero)) {
                sign = "+"
            }
            t.appendChild(new Text(sign + speed.toDecimal() + "%"))
        }
        if (!this.productivity.isZero()) {
            var productivity = this.productivity.mul(hundred)
            if (first) {
                t.appendChild(document.createElement("br"))
            } else {
                first = true
            }
            b = document.createElement("b")
            b.textContent = "Productivity: "
            t.appendChild(b)
            var sign = ""
            if (!this.productivity.less(zero)) {
                sign = "+"
            }
            t.appendChild(new Text(sign + productivity.toDecimal() + "%"))
        }
        return t
    }*/
}

function moduleDropdown(selection, name, selected, callback, filter) {
    let rows = moduleRows

    let dropdown = makeDropdown(selection)
    let options = dropdown.selectAll("div")
        .data(rows)
        .join("div")
            .selectAll("span")
            .data(d => d)
            .join("span")
    if (filter) {
        options = options.filter(filter)
    }
    let labels = addInputs(
        options,
        name,
        selected,
        callback,
    )
    labels.append(d => {
        if (d === null) {
            let noModImage = getExtraImage("slot_icon_module")
            noModImage.title = NO_MODULE
            return noModImage
        } else {
            return getImage(d, false, dropdown.node())
        }
    })
    let inputs = {}
    options.each(function(d) {
        let element = d3.select(this).select('input[type="radio"]').node()
        if (d === null) {
            inputs[NO_MODULE] = element
        } else {
            inputs[d.name] = element
        }
    })
    return {dropdown: dropdown.node(), inputs: inputs}
}

// ModuleSpec represents the set of modules (including beacons) configured for
// a given recipe.
export class ModuleSpec {
    constructor(recipe) {
        this.recipe = recipe
        this.building = null
        this.modules = []
        this.beaconModules = [null, null]
        this.beaconCount = zero
    }
    setBuilding(building, spec) {
        this.building = building
        if (this.modules.length > building.moduleSlots) {
            this.modules.length = building.moduleSlots
        }
        let toAdd = null
        if (spec.defaultModule && spec.defaultModule.canUse(this.recipe)) {
            toAdd = spec.defaultModule
        }
        while (this.modules.length < building.moduleSlots) {
            this.modules.push(toAdd)
        }
    }
    getModule(index) {
        return this.modules[index]
    }
    // Returns true if the module change requires a recalculation.
    setModule(index, module) {
        if (index >= this.modules.length) {
            return false
        }
        let oldModule = this.modules[index]
        let needRecalc = (oldModule && oldModule.hasProdEffect()) || (module && module.hasProdEffect())
        this.modules[index] = module
        return needRecalc
    }
    speedEffect() {
        let speed = one
        for (let module of this.modules) {
            if (!module) {
                continue
            }
            speed = speed.add(module.speed)
        }
        if (this.modules.length > 0) {
            let beaconModule = this.beaconModule
            if (beaconModule) {
                speed = speed.add(beaconModule.speed.mul(this.beaconCount).mul(half))
            }
        }
        return speed
    }
    prodEffect(spec) {
        let prod = one
        for (let module of this.modules) {
            if (!module) {
                continue
            }
            prod = prod.add(module.productivity)
        }
        return prod
    }
    powerEffect(spec) {
        let power = one
        for (let module of this.modules) {
            if (!module) {
                continue
            }
            power = power.add(module.power)
        }
        if (this.modules.length > 0) {
            let beaconModule = this.beaconModule
            if (beaconModule) {
                power = power.add(beaconModule.power.mul(this.beaconCount).mul(half))
            }
        }
        let minimum = Rational.from_floats(1, 5)
        if (power.less(minimum)) {
            power = minimum
        }
        return power
    }
    /*powerUsage(spec, count) {
        let power = this.building.power
        if (this.building.fuel) {
            return {"fuel": this.building.fuel, "power": power.mul(count)}
        }
        // Default drain value.
        let drain = power.div(Rational.from_float(30))
        let divmod = count.divmod(one)
        power = power.mul(count)
        if (!divmod.remainder.isZero()) {
            let idle = one.sub(divmod.remainder)
            power = power.add(idle.mul(drain))
        }
        power = power.mul(this.powerEffect(spec))
        return {"fuel": "electric", "power": power}
    }
    recipeRate: function(spec, recipe) {
        return recipe.time.reciprocate().mul(this.factory.speed).mul(this.speedEffect(spec))
    }*/
}

export let moduleRows = null

export function getModules(data) {
    let modules = new Map()
    for (let key of data.modules) {
        let item = data.items[key]
        let effect = item.effect
        let category = item.category
        let order = item.order
        let speed = Rational.from_float((effect.speed || {}).bonus || 0)
        let productivity = Rational.from_float((effect.productivity || {}).bonus || 0)
        let power = Rational.from_float((effect.consumption || {}).bonus || 0)
        let limit = item.limitation
        modules.set(key, new Module(
            key,
            item.localized_name.en,
            item.icon_col,
            item.icon_row,
            category,
            order,
            productivity,
            speed,
            power,
            limit
        ))
    }
    let sortedModules = sorted(modules.values(), m => m.order)
    moduleRows = [[null]]
    let category = null
    for (let module of sortedModules) {
        if (module.category !== category) {
            category = module.category
            moduleRows.push([])
        }
        moduleRows[moduleRows.length - 1].push(module)
    }
    return modules
}
