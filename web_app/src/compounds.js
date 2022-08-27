// from effects import Doom, Poison, Effect
// from utilities import slow_print

/*
Mercury: makes enemies crazy and attack each other
Gold: grants 2 other attacks
Silver: grants 1 other attack
Lead: some doom damage
Cyanide: poison
Chlorine: poison
Sodium: explodes on neighbors
Calcium: makes player stronger
Copper: electric shock that jumps from enemy to enemy 
*/


const compound_to_damage_dict = {
    'H2': 2,
    'CH4': 4,
    'NH3': 5,
    'CO': 1,
    'CN': 4,
    'H2O': 2,
    'O2': 1,
    'Au': 5,
    'Ag': 4,
    'Pb': 8,
    'Al': 9,
    'Si': 2,
    'Ca': 4,
    'Na': 9,
    'Cl': 9,
    'Mg': 6
}

const formula_to_name_dict = {
    'H2': 'Hydrogen gas',
    'CH4': 'Methane',
    'NH3': 'Ammonia',
    'CO': 'Carbon Monoxide',
    'CN': 'Cyanide',
    'H2O': 'Water',
    'O2': 'Oxygen gas',
    'Au': 'Gold',
    'Ag': 'Silver',
    'Pb': 'Lead',
    'Al': 'Aluminum',
    'Si': 'Silicon',
    'Ca': 'Calcium',
    'Na': 'Sodium',
    '2Na': 'Sodium x 2',
    '3Na': 'Sodium x 3',
    'Cl': 'Chlorine',
    '2Cl': 'Chlorine x 2',
    '3Cl': 'Chlorine x 3',
    'Mg': 'Mercury',
    'NaCl': 'Sodium Chloride (table salt)'
}


export default class Compound {
    constructor(formula, effects = []) {
        this.formula = formula
        this.name = ''
        this.effects = effects
        this.damage = 0
    }

    toString () {
        string = `${this.name} (${this.formula}): ${this.damage} damage. \n\tEffects: `
        for (effect in this.effects) {
            string += "\n\t\t"
            string += effect.toString()
        }
        return string
    }

    
    static classmeth_parse_formula_to_dict(formula){
        /*
        returns a dictionary of the element counts
        ex: Br2ClNH3 -> {'Br': 2, 'Cl': 1, 'N': 1, 'H': 3}
        */
        element_counts = {}
        element = ''
        count = ''
        for (c in formula) {
            try {
                num = int(c)
                if (count) {
                    count += num
                }
                else {
                    count = num
                }
            } catch (error) {
                // Every element symbol has only 1 capital, so a capital signals a new element
                if (c.isupper()) {
                    if (element){
                        try{
                            addition = int(count) ? int(count) : 1
                        }
                        catch (error) {
                            addition = 1
                        }
                        if (element_counts.get(element, None)) {
                            element_counts[element] += addition
                        }
                        else{
                            element_counts[element] = addition
                        }
                        element = ''
                        count = ''
                    element = c
                    }
                }
                else{
                    element += c
                }
            }
        }
        if (element) {
            try{
                addition = int(count) ? int(count) : 1
            }
            catch (error) {
                addition = 1
            }
            if (element_counts.get(element, None)) {
                element_counts[element] += int(count)
            }
            else {
                element_counts[element] = addition
            }
        }
        return element_counts
    }

    parse_formula_to_dict(self) {
        return Compound.classmeth_parse_formula_to_dict(this.formula)
    }

    // TODO: Coefficient doesnt multiply effects. Seems fair right?
    damage_enemy(enemy, coefficient) {
        if (!enemy) {
            throw 'Could not damage enemy that doesnt exist.'
        }
        dmg = this.damage * coefficient
        slow_print("Attacked enemy {} with {}({}) for {} damage".format(enemy.name, this.name, this.formula, dmg))
        enemy.damage(dmg)
        // TODO: this stacks the effects, but do we want that?
        if (this.effects.length) {
            for (effect in this.effects) {
                enemy.add_effect(effect)
            }
        }
    }
}


class Cyanide extends Compound {
    constructor(enemy){
        this.formula = 'CN'
        this.name = 'Cyanide'
        this.effects = [Poison(compound=self, enemy=enemy, damage=2)]
        this.damage = 4
    }
}


class Lead extends Compound {
    constructor(enemy){
        this.formula = 'Pb'
        this.name = 'Lead'
        this.effects = [Doom(compound=self, enemy=enemy, damage=20)]
        this.damage = 5
    }
}


class Chlorine extends Compound {
    constructor(enemy){
        this.formula = 'Cl'
        this.name = 'Chlorine'
        this.effects = []
        this.damage = 9
    }
}


class CompoundFactory extends Compound {
    formulas_to_class = {
        'H2': 'Hydrogen gas',
        'CH4': 'Methane',
        'NH3': 'Ammonia',
        'CO': 'Carbon Monoxide',
        'CN': Cyanide,
        'H2O': 'Water',
        'O2': 'Oxygen gas',
        'Au': 'Gold',
        'Ag': 'Silver',
        'Pb': Lead,
        'Al': 'Aluminum',
        'Si': 'Silicon',
        'Ca': 'Calcium',
        'Na': 'Sodium',
        '2Na': 'Sodium x 2',
        '3Na': 'Sodium x 3',
        'Cl': 'Chlorine',
        '2Cl': 'Chlorine x 2',
        '3Cl': 'Chlorine x 3',
        'Mg': 'Mercury',
        'NaCl': 'Sodium Chloride (table salt)'
    }

    // static function create(formula, enemy){
    //     return this.formulas_to_class.get(formula)(enemy)
    // }
}



// import uuid

// from utilities import slow_print


class Effect {
    constructor(compound, enemy, damage, turns_until_effect){
        this.compound = compound
        this.enemy = enemy
        this.damage = damage
        this.turns_until_effect = turns_until_effect
        this.uuid = uuid.uuid4()
    }
}


class Poison extends Effect{
    constructor(compound=None, enemy=None, damage=0){
        turns_until_effect = 0
        // super(Poison, self).__init__(compound, enemy, damage, turns_until_effect)
    }

    toString(){
        return "Poison{ does {} damage every turn".format(this.damage)
    }

    call(self) {
        slow_print('{} poison does {} damage to {}'.format(this.compound.name, this.damage, this.enemy.name))
        this.enemy.damage(this.damage)
        this.damage -= 1
        if (this.damage <= 0){
            this.enemy.remove_effect(this.uuid)
            // del self
        }
    }
}


class Doom extends Effect{
    constructor(compound=None, enemy=None, damage=0){
        turns_until_effect = 4
        super(Doom, self).__init__(compound, enemy, damage, turns_until_effect)
    }

    toString() {
        return "Doom: a blast of {} damage after {} turns".format(this.damage, this.turns_until_effect)
    }

    call(){
        if (this.turns_until_effect > 0){
            slow_print('{} turns until DOOM effect on {}'.format(this.turns_until_effect, this.enemy.name))
            this.turns_until_effect -= 1   
        }
        else{
            slow_print('{} does {} DOOM damage to {}'.format(this.compound.name, this.damage, this.enemy.name))
            this.enemy.damage(this.damage)
            this.enemy.remove_effect(this.uuid)
            // del this
        }
    }
}
        

















// import json
// import time
    
/*
class JsonSerializable(object){
    # https://yzhong-cs.medium.com/serialize-and-deserialize-complex-json-in-python-205ecc636caa
    function toJSON(){
        return json.dumps(default=lambda o: o.__dict__, sort_keys=True, indent=4)


    @classmethod
    def fromJSON(cls, json_data){
        return cls(**json_data)
    
    
    
    def slow_print(text){
        time.sleep(0)
        print(text)
    
    
    def get_coefficient(string){
        coefficient = '0'
        start = 0
        chars = list(string)
        for idx, c in enumerate(chars){
            try{
                int(c)
                coefficient += c
            except Exception{
                start = idx
                break
        # do the max of 1 and int(coefficient) because no coefficient is assumed to be 1
        return max(1, int(coefficient)), ''.join(chars[start:])
    
    
    def measure_performance(func){
        def wrapper(*args, **kwargs){
            start = time.monotonic_ns()
            return_value = func(*args, **kwargs)
            end = time.monotonic_ns()
            print('{} function took {} nanoseconds to run'.format(func.__name__, end - start))
            return return_value
        return wrapper
    
    
    def least_common_multiple(num_arr){
        # lazy method is just return the multiple of all of the numbers, which is not an LCM, but it works the same
        return reduce(lambda serialized, num: serialized * num, num_arr, 1)
    
        # lcm = 1
        # # make sure they are all not 1, because if so, the lcm is just 1
        # if max(num_arr) == 1{
        #     return 1
    
        # def all_nums_are_factors(num_arr){
        #     for num in num_arr{
        #         if lcm % num != 0{
        #             return False
        #     return True
    
        # # some random upper bound so we dont run to infinity if this code is wrong
        # while lcm < 1000{
        #     lcm += 1
        #     if all_nums_are_factors(num_arr){
        #         return lcm
        # raise Exception("Least common multiple was not found")
    
    
    # def find_random_compound(self, elements, compounds){
    #     element_counts = {}
    #     for element in elements{
    #         element_counts[]
    #     possible_compounds = []
    #     for compound in compounds{
    #         pass
*/