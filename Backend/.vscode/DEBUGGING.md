# 🐛 Debugging Guide - Node.js in VS Code (zoals .NET in Visual Studio)

## ✅ Setup Complete!

Je hebt nu een volledig werkende debug configuratie, net zoals in Visual Studio!

## 🎯 Hoe te debuggen (EXACT zoals .NET)

### **Methode 1: F5 Debugging (Aanbevolen)**

1. **Open je bestand** in VS Code (bijv. `services/biasAnalyzer.js`)
2. **Klik in de gutter** (links van de regel nummers) om een **rode breakpoint** te zetten 🔴
3. **Druk op F5** (of klik op "Run and Debug" in sidebar)
4. **Selecteer**: "🚀 Debug Prism Backend"
5. **Wacht** tot je app start
6. **Trigger je endpoint** (bijv. curl commando of test-analyzer.html)
7. **Code pauzeert** op je breakpoint! ⏸️

### **Wat je nu kunt doen (zoals .NET):**

| VS Code | .NET Visual Studio | Actie |
|---------|-------------------|-------|
| **F5** | F5 | Start debugging |
| **F10** | F10 | Step Over |
| **F11** | F11 | Step Into |
| **Shift+F11** | Shift+F11 | Step Out |
| **F5** (tijdens debug) | F5 | Continue |
| **Shift+F5** | Shift+F5 | Stop debugging |
| **Ctrl+Shift+F5** | Ctrl+Shift+F5 | Restart |

### **Debug Panels (zoals .NET):**

**1. Variables Panel** (zoals Watch/Locals in .NET)
- Zie alle lokale variabelen
- Hover over variabelen om waarde te zien
- Expand objecten om properties te inspecteren

**2. Watch Panel**
- Voeg expressions toe om te monitoren
- Bijv: `fullResponse.length`, `error.message`

**3. Call Stack**
- Zie EXACT waar je bent in de call stack
- Klik op stack frames om te navigeren
- Net zoals .NET! 🎯

**4. Breakpoints Panel**
- Zie alle breakpoints
- Enable/disable snel
- Conditional breakpoints (right-click breakpoint)

**5. Debug Console** (zoals Immediate Window)
- Type expressies tijdens debugging
- Bijv: `console.log(fullResponse)`
- Evalueer code on-the-fly!

---

## 🔥 Advanced Debugging Features

### **Conditional Breakpoints**
Right-click op een breakpoint → "Edit Breakpoint" → Voeg conditie toe:
```javascript
error.message.includes('parse')
```
Breakt alleen als conditie `true` is!

### **Logpoints** (Breakpoints zonder stoppen)
Right-click in gutter → "Add Logpoint"
```javascript
Article length: {articleContent.length}
```
Logt zonder te pauzeren!

### **Exception Breakpoints**
In Breakpoints panel → ✅ "Caught Exceptions"
Pauzeert op ELKE exception! (zoals .NET "Break when thrown")

---

## 🎯 Praktijk Voorbeeld

**Scenario: Debug de JSON parse error**

1. Open `services/biasAnalyzer.js`
2. Zoek regel met: `const analysisResult = JSON.parse(cleanedResponse);`
3. Klik in gutter om breakpoint te zetten 🔴
4. Druk **F5**
5. Test je endpoint (curl of HTML test tool)
6. Code pauzeert op de regel!
7. In **Variables** panel zie je:
   - `cleanedResponse` (de string die je probeert te parsen)
   - `fullResponse` (raw response van Claude)
8. In **Debug Console** type:
   ```javascript
   cleanedResponse.substring(0, 100)
   ```
   Zie exact wat er wordt geparsed!
9. Druk **F10** (Step Over) om naar volgende regel te gaan
10. Als error optreedt, zie je het in **Call Stack**!

---

## 🚨 Troubleshooting

**Breakpoint wordt niet geraakt?**
- ✅ Check dat je debug mode draait (niet `npm start`)
- ✅ Check dat code bereikbaar is (endpoint wordt aangeroepen)
- ✅ Restart debugger (Ctrl+Shift+F5)

**Variabelen niet zichtbaar?**
- ✅ Zorg dat je op de juiste stack frame bent
- ✅ Hover over variabele in code editor

**"Cannot connect to runtime process"**
- ✅ Sluit alle andere Node.js processen
- ✅ Restart VS Code

---

## 📊 Vergelijking .NET vs Node.js Debugging

| Feature | .NET (Visual Studio) | Node.js (VS Code) |
|---------|---------------------|-------------------|
| **Breakpoints** | ✅ Red dot | ✅ Red dot |
| **Step Over/Into/Out** | ✅ F10/F11/Shift+F11 | ✅ F10/F11/Shift+F11 |
| **Watch Window** | ✅ | ✅ Watch panel |
| **Locals** | ✅ | ✅ Variables panel |
| **Call Stack** | ✅ | ✅ Call Stack panel |
| **Immediate Window** | ✅ | ✅ Debug Console |
| **Exception Settings** | ✅ | ✅ Breakpoints panel |
| **Conditional Breakpoints** | ✅ | ✅ Right-click breakpoint |
| **Edit & Continue** | ✅ | ⚠️ Requires restart |

**Conclusie:** Bijna identiek! 🎉

---

## 💡 Pro Tips

1. **Gebruik Logpoints** voor quick debugging zonder pauzeren
2. **Conditional breakpoints** voor specifieke scenarios
3. **Debug Console** voor on-the-fly code execution
4. **Restart on save**: In launch.json staat `"restart": true` → auto-restart bij file changes!
5. **Skip node_internals**: Configuratie skipt Node.js internals → alleen jouw code!

---

## 🎓 Oefening

**Debug deze code:**

1. Zet breakpoint op regel: `const analysisResult = JSON.parse(cleanedResponse);`
2. Start debugger (F5)
3. Trigger endpoint met: `curl.exe -X POST http://localhost:5000/analyze-article -H "Content-Type: application/json" -d "{\"url\": \"https://www.bbc.com/news\"}"`
4. Wanneer breakpoint raakt:
   - Inspecteer `cleanedResponse` in Variables panel
   - Type in Debug Console: `cleanedResponse.substring(0, 200)`
   - Check of het valide JSON is
   - Press F10 om parse te executen
   - Zie wat er gebeurt!

**Je kunt nu debuggen zoals in .NET!** 🚀
