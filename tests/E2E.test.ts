describe('Play Class End-to-End Tests', () => {
  beforeEach(() => {
      // Load the page that includes the BabylonJS scene
      cy.visit('/path-to-your-html-file.html');
  });

  it('should initialize the scene correctly', () => {
      // Add assertions to verify the scene initialization
      cy.window().then((win) => {
          expect(win.scene).to.exist;
      });
  });

  it('should have the correct initial position of the tank', () => {
      cy.window().then((win) => {
          const tankPosition = win.scene.getMeshByName('tank_holder').position;
          expect(tankPosition).to.deep.equal({ x: 0, y: 0, z: 0 }); // Modify as needed
      });
  });

  it('should update the tank position on key press', () => {
      // Simulate key press and check the tank's new position
      cy.window().then((win) => {
          const tank = win.scene.getMeshByName('tank_holder');
          cy.get('body').type('w'); // Simulate pressing the 'w' key
          cy.wait(1000); // Wait for a moment
          const newTankPosition = tank.position;
          expect(newTankPosition).to.not.deep.equal({ x: 0, y: 0, z: 0 }); // Modify as needed
      });
  });

  it('should play sounds correctly', () => {
      // Add assertions to verify sounds are played
      cy.window().then((win) => {
          const sounds = win.scene.sounds;
          expect(sounds).to.have.length.greaterThan(0);
          sounds.forEach(sound => {
              cy.stub(sound, 'play').as('playSound');
          });
      });
      cy.get('@playSound').should('have.been.called');
  });

  it('should show and hide control image correctly', () => {
      cy.get('img#control').should('be.visible');
      cy.wait(7500);
      cy.get('img#control').should('not.be.visible');
  });

  it('should open the correct URLs when targets are hit', () => {
      // Simulate shooting at targets and verify the URL opened
      cy.window().then((win) => {
          cy.stub(win, 'open').as('openUrl');
      });
      cy.get('body').type('e'); // Simulate pressing the 'e' key
      cy.wait(1000); // Wait for the URL to open
      cy.get('@openUrl').should('have.been.calledWith', 'https://github.com/Setin2'); // Modify as needed
  });
});
