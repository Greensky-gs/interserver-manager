type dataType = { letters?: boolean, capitals?: boolean, numbers?: boolean, special?: boolean, includeSpaces?: boolean, overflow?: string, length: number };

export class WordGenerator {
    #letters: string;
    data: dataType;
    #size: number;

    constructor(data: dataType) {
        this.#letters = "";
        this.data = data;
        this.#size = data.length || 16;
    }
    init() {
      if (this.data.letters == true) this.#letters = "abcdefghijklmnopqrstuvwx";
      if (this.data.capitals == true) this.#letters+= "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (this.data.numbers == true) this.#letters+="012345678";
      if (this.data.special == true) this.#letters+="+×÷=/_€£¥₩!@#$%^&*()-:;,?`~|<>{}[]]}";
      if (this.data.includeSpaces == true) this.#letters += " ";
      if (this.data.overflow !== undefined) {
        for (let i = 0; i < this.data.overflow.length; i++) {
          let charact = this.data.overflow[i];
          if (!this.#letters.includes(charact)) this.#letters+= charact;
        }
      };
    }
    generate() {
        this.init();

        let word = "";
        for (let i = 0; i < this.#size; i++) {
          let charact = this.#letters[Math.floor(Math.random() * this.#letters.length)];
          
          word += charact;
        };
        
        return word;
    }
};