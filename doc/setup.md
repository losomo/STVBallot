## Příprava pro práci v komisi

### Zapojení počítačů do sítě

Pro zapojení je třeba mít síťové ethernetové kabely a router. Všechny počítače
se zapojují do zdířek routeru označených jako **`LAN`**. Zdířka routeru s
označením **`WAN`** (obvykle jen jediná a barevně odlišená) zůstává nezapojena.
Počítač předsedy komise je zapojen stejně jako počítače ostatních členů.

Router musí být zapojen v elektrické síti.

V případě, že počet počítačů převyšuje počet zdířek `LAN`, je možné síť
rozšířit o *switch*. Jeho libovolný výstup se propojí s libovolnou zdířkou
`LAN` na routeru a počítače se pak připojí k dalším zdířkám switche.

### Nastavení sítě

Pro fungování aplikace je nutné u počítače předsedy nastavit případný
*firewall* tak, aby propouštěl příchozí spojení na port **42424**. Pro všechny
počítače zapojené do sítě platí, že musí být umožněno odchozí spojení na tomto
portu, což obvykle nebývá takový problém.

Nastavení firewallu je závislé na použitém operačním systému a firewallu, a není
proto možné sem sepsat přesné instrukce.

V okamžiku, kdy členové komise mají nainstalovanou aplikaci, nepotřebují
přístup k Internetu a je vhodné před připojením k routeru na počítačích vypnout
bezdrátové sítě, aby nedocházelo k problémům způsobeným pokusy o komunikaci
přes bezdrátovou síť.

### Zjištění IP adresy předsedy komise

Členové komise musejí při připojení zadat IP adresu počítače předsedy. To jsou
4 čísla v rozmezí 0-255 oddělená tečkami, například `168.192.1.100`  
Předseda komise může tuto adresu zjistit na příkazové řádce spuštěním příkazu `ifconfig`
(v prostředí Mac / Linux / Unix) resp. `ipconfig` (v prostředí MS Windows).
