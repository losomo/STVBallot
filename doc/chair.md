## Předseda volební komise: nastavení a průběh volby

### Nastavení volby

- *Připojení*: Zde se průběžně ukazují členové komise, kterým se podařilo úspěšně připojit. Červeným tlačítkem vedle jejich jména je možné je v této fázi odpojit.

- *Označení volby*: Libovolný text, který se bude objevovat v protokolu. Např. *Volba členů ÚRK*

- *Počet kandidátů*: Číslo vyjadřující počet lidí, kteří do orgánu nebo na kandidátku v této volbě kandidují. Musí být vyplněno.

- *Počet mandátů*: Velikost orgánu nebo kandidátky. Tedy kolik lidí má být v ideálním případě zvoleno. Musí být vyplněno.

- *Počet hlasovacích lístků*: Počet oprávněných volitelů. Toto číslo je potřeba při případném tisku volebních lístků, který zatím není umožněn. Toto číslo nemá na výsledek volby vliv, ale pomáhá odhadovat, jaká část lístků už je členy komise zpracována. Musí být vyplněno

- *Mužů maximálně*: Globální omezení počtu mužů v orgánu nebo na kandidátce. Pokud při výpočtu je obsazen uvedený počet míst muži, z obsazování dalších míst jsou vyřazeni. Pokud není žádné omezení na celkový počet mužů, může zůstat pole prázdné.

- *Žen maximálně*: Totéž jako předchozí pole pro muže

- *Pozic s pořadím*: Pokud je nevyplněno, je volba spočítána jednodušším způsobem bez ohledu na pořadí (ale pokud jsou aktivní genderová omezení, toto neplatí, protože pořadí je nutné znát kvůli nim). Pokud je vyplněno, číslo udává, u kolika mandátů záleží na jejich pořadí. Nemusí být vyplněno, pak je to totéž jako nula.

   Příklad 1: u volby na kandidátní listinu bude *Pozic s pořadím* stejné číslo jako *Počet mandátů*, protože v celé délce kandidátky záleží na pořadí

   Příklad 2: u volby PSZ bude *Pozic s pořadím* 2 a *Počet mandátů* 5, protože na pořadí záleží jen pro stanovení 2. a 3. místopředsedy SZ, další 3 mandáty jsou rovnocenné

- *Omezení od **A** do **B** mužů max. **M** žen max. **Ž***: Genderové omezení na určitý úsek voleného orgánu nebo kandidátky. Po vyplnění omezení se objeví možnost vyplnění dalšího, těchto omezení je možno zadávat víc. Omezení zajišťuje, aby na místech **A** až **B** nebylo více než **M** mužů a **Ž** žen. Nemusí být vyplněno. Pokud je omezení víc, výpočet bude probíhat tak, aby platila všechna zároveň.

   Příklad: Při volbě na kandidátku musí být v první dvojici zastoupena obě pohlaví a v každé další trojici také. Pokud chceme v jedné volbě zvolit kandidátku s 10 místy, zadáme tři omezení takto:

   <table class="griddy">
   <tr><th> A </th><th> B </th><th> M </th><th> Ž </th></tr>
   <tr><td> 1 </td><td> 2 </td><td> 1 </td><td> 1 </td></tr>
   <tr><td> 3 </td><td> 5 </td><td> 2 </td><td> 2 </td></tr>
   <tr><td> 6 </td><td> 8 </td><td> 2 </td><td> 2 </td></tr>
   </table>

- *Seznam kandidátů*: Pole se jmény a pohlavími kandidátů. Pokud nejsou žádána žádná genderová omezení, pohlaví kandidátů **nesmí** být vyplněna. Pokud existuje aspoň jedno genderové omezení, pohlaví všech kandidátů musí být vyplněna. Jména jsou na počátku nahrazena písmeny, je třeba, aby všechna jména byla vyplněna a žádné se neopakovalo. Pokud je vyplněno *Pozic s pořadím*, vpravo od pohlaví se objeví ještě zaškrtávací políčka, kterými lze indikovat, že daný kandidát na některou pozici nekandiduje. Zaškrtávacích políček je *Pozic s pořadím* + 1, zleva doprava odpovídají pozicím od nejvyšší po nejnižší a poslední políčko indikuje, zda daný kandidát kandiduje na zbývající místa, kde na pořadí už nezáleží. Na počátku jsou všechna políčka zaškrtnutá, t.j. všichni kandidáti mají zájem kandidovat na všechna místa.

- *Zamíchat kandidáty*: Tlačítko pro jednorázové zamíchání kandidátů, pokud volební komise neprovedla vylosování pořadí kandidátů předem. Není obvykle nutné použít.

- *Zahájit volbu*: Tlačítko pro zahájení zpracování lístků. Pokud je tlačítko zelené, lze zahájit zpracování. Pokud je šedé, ve vyplněném nastavení je nějaký problém. Například:
    - Označení volby je prázdné
    - Počet kandidátů, Počet mandátů, Počet hlasovacích lístků, Mužů maximálně, Žen maximálně nebo Pozic s pořadím není kladné celé číslo
    - Pozic s pořadím je větší číslo než Počet mandátů
    - V Omezení od A do B  mužů max. M žen max. Ž je některé číslo nevyplněno, A > B nebo B > Pozic s pořadím
    - Jména některých kandidátů se shodují
    - Jsou vyplněna pohlaví, i když na nich nezáleží, nebo na pohlaví záleží, ale nejsou všechna vyplněna

## !Tlačítko zahájit volbu stiskněte až v okamžiku, kdy jsou všichni členové komise připojeni!

### Průběh volby

Průběh volby tlačítko "Tisk hlasovacích lístků", které vyvolá dialog umožňující uložit HTML soubor, který lze dále využít pro tisk hlasovacích lístků. Tato funkce není ještě doladěná a praktičtější bude vytisknout si lístky jiným způsobem.

Dále se ukazuje tabulka "hromádek" a pokroku v jejich sčítání. Každá řádka tabulky odpovídá jednomu
členu komise. Sloupce ukazují pokrok ve vyplnění hlavní a kontrolní hromádky. Indikátor za nimi ukazuje status hromádky:

- šedá: data ještě nejsou zadána ani jednou
- žlutá: data jsou zadána jednou
- červená: data jsou zadána dvakrát a liší se
- zelená: data jsou zadána dvakrát a mají shodný obsah

Pokud člen komise u některé hromádky stiskne *Hotovo*, už ji nemůže dále upravovat. 
Tlačítkem *Opravit* může předseda komise vrátit hromádku do otevřeného stavu, aby ji příslušní členové mohli zase upravovat. Pokud byl před tím stav *červená*, členům komise se zvýrazní lístky, ve kterých byly nalezeny rozdíly.

Tlačítko *Uzavřít sčítání* spustí výpočet výsledku volby a zobrazí výsledky. Tlačítko by mělo být stisknuto až v momentě, kdy u všech hromádek svítí zelená a jsou tedy zkontrolované.

### Zpráva o výpočtu

Podrobná zpráva o výpočtu na konci ukazuje obsazení jednotlivých míst.

- *Export protokolu*: umožňuje uložit zprávu o výpočtu jako HTML soubor.
- *Export do OpenSTV*: umožňuje uložit hlasovací lístky ve formátu vhodném pro zpracování OpenSTV. Jelikož OpenSTV nemá všechny funkce aplikace STVBallot, tento export je ztrátový, nepřenáší se genderová omezení a nic okolo pozic s pořadím.
- *Export do JSONu*: umožňuje vyplněné lístky uložit pro možnou kontrolu výpočtu a [další zpracování](cli.html). Tento soubor by měl být součástí dat archivovaných volební komisí z každé volby
- *Přejít k nové volbě*: Umožňuje s připojenými členy komise provést další volbu, všechna nastavení se zachovávají, pouze Označení volby se pro rozlišení zvýší.
