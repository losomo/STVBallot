## Člen volební komise: zadávání hlasovacích lístků

### Připojení člena komise do sítě

Po spuštění aplikace a vyplnění jména člena komise je třeba zadat IP adresu počítače předsedy komise. Tu je třeba zjistit od něj.

Dokud je tlačítko *Připojit* aktivní, připojení se nezdařilo.

Po úspěšném připojení okno zšedne a objeví se nápis *Čekám na zadání*. Jakmile předseda komise stiskne *Zahájit volbu*, měl by se aktivovat vyplňovací formulář.

### Ovládací prvky kolem vyplňování

Je třeba věnovat pozornost vyklápěcímu seznamu vlevo nahoře. Ten má dvě položky.

1. Hlavní hromádku. Ta neobsahuje jméno v závorce.
1. Kontrolní hromádku. Ta obsahuje jméno v závorce.

**Na začátku je třeba vybrat hlavní hromádku**. Po jejím vyplnění si musí člen komise říct členu komise uvedenému v kontrolní hromádce, aby mu předal svoji hromádku lístků ke kontrole. Komu bude svoji hromádku předávat, člen komise v aplikaci nevidí, musí počkat, až ho také někdo vyzve k předání.

Tlačítko *Začít znovu* smaže všechny lístky z aktuální hromádky. Normálně by nemělo být potřeba.

Tlačítko *Hotovo* označí danou hromádku jako kompletně zadanou. Po jeho stisknutí není možné dělat úpravy hromádky. Opětovně úpravy povolit může předseda.

Tlačítko *Export protokolu* umožňuje uložit vyplněnou hromádku jako HTML soubor pro kontrolu nebo jako doklad, co daný člen komise vyplnil.

V případě, že kontrolní hromádka se neshoduje s hlavní, jsou problematické lístky označeny tučným číslem lístku (pod sloupcem).

### Zadání lístků

V oblasti zadání lístků jsou vlevo tlačítka se jmény kandidátů a pod nimi tlačítko + pro přidávání nových lístků. Každému hlasovacímu lístku odpovídá jeden sloupec. Sloupce jsou číslovány pro lepší zpětnou kontrolu. Pokud je detekována neshoda na některém lístku. Jeho číslo se objevuje tučně.

Hlasovací lístek lze zadat dvěma základními způsoby:

1. myší: kliknutím na jméno, které má preferenci 1, pak na jméno, které má preferenci 2, atd. Tímto způsobem se do sloupce vyplňují po řadě daná čísla. Pro vyplnění dalšího lístku je možné buď kliknout na tlačítko +, nebo pokud nejpreferovanější kandidát z dalšího lístku byl uveden i na právě vyplněném, je možné prostým kliknutím na jeho jméno začít vyplňovat nový lístek.
1. klávesnicí: Je možné přímo zadávat čísla do jednotlivých buněk.

Nad sloupcem je kontrolní nápis *ok*, který se změní v případě, že lístek není zadán korektně (t.j. nejde o souvislou řadu přirozených čísel začínající jedničkou). Pokud je chyba v samotném hlasovacím lístku, je nutné ho označit jako *Neplatný*. V takovém případě není třeba u takového lístku čísla vyplňovat, protože se na ně stejně nebere ohled.

Prázdné lístky je vždy nutné označit jako *Prázdný*, nestačí nechat čísla nevyplněná.

### Řešení problémů

Při problémech s připojením je dobré zjistit, zda připojení na některé straně nebrání firewall.

Pokud se po nějakém problému nedaří členu komise připojit, může pomoci vypnutí prohlížeče Chrome a opětovné spuštění.

Pokud během vyplňování dojde k přerušení spojení, například někdo omylem překousne kabel, zavře okno aplikace nebo vytáhne router ze zásuvky, je možné se znovu k předsedovi připojit a pokračovat v rozdělané práci, při připojování je však třeba zadat *naprosto shodné* jméno člena komise jako při prvním přihlášení.

Pokud dojde k výpadku routeru, může se změnit IP adresa předsedy a je nutné ji znovu zjistit.

Pokud u některého člena komise přetrvávají problémy s připojením (stalo se nám, že se přeneslo vždycky jen prvních 12 lístků a další ne), je možné se nouzově připojit pod stejným jménem z jiného stroje nebo dokonce ze stroje jiného člena komise. V prohlížeči Chrome je možné pustit aplikaci vícekrát a tak je možné na jednom stroji zpracovávat i víc hromádek.
