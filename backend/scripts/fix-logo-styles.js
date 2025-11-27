const fs = require('fs');
const path = require('path');

console.log('\n🎨 Ajustando estilos del logo...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Buscar el logo actual
const oldLogo = `<a href="#" class="nav-logo">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="color: #60a5fa; display: inline-block; transform: skewX(-8deg); font-size: 1.5em;">A</span><span style="font-size: 1.5em;">ponnt</span>
                        <span style="font-size: 0.9em; color: #60a5fa; font-weight: 600;">360º</span>
                    </div>
                    <div style="font-size: 0.55em; color: #64748b; margin-top: -0.15rem; letter-spacing: 0.5px; font-weight: 500;">Intelligent Ecosystem</div>
                </div>
            </div>
        </a>`;

// Nuevo logo con ajustes:
// - "ponnt" en negro (#1a1a2e) sin negrita
// - "360º" reducido 20% (0.9em → 0.72em)
const newLogo = `<a href="#" class="nav-logo">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="color: #60a5fa; display: inline-block; transform: skewX(-8deg); font-size: 1.5em;">A</span><span style="font-size: 1.5em; color: #1a1a2e; font-weight: 400;">ponnt</span>
                        <span style="font-size: 0.72em; color: #60a5fa; font-weight: 600;">360º</span>
                    </div>
                    <div style="font-size: 0.55em; color: #64748b; margin-top: -0.15rem; letter-spacing: 0.5px; font-weight: 500;">Intelligent Ecosystem</div>
                </div>
            </div>
        </a>`;

htmlContent = htmlContent.replace(oldLogo, newLogo);

fs.writeFileSync(indexPath, htmlContent, 'utf8');

console.log('✅ Logo ajustado:');
console.log('   - "ponnt" en negro (#1a1a2e) sin negrita (font-weight: 400)');
console.log('   - "360º" reducido 20% (0.9em → 0.72em)');
console.log('   - "A" sigue en azul con skew\n');
