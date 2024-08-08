// cypress/integration/play.spec.js
describe('Play Application', () => {
    beforeEach(() => {
      cy.visit('/'); // Change this to the URL of your application
    });
  
    it('should load the scene', () => {
      cy.get('canvas').should('exist');
    });
  
    it('should display control instructions', () => {
      cy.contains('ALPHA VERSION: UNDER DEVELOPEMENT').should('be.visible');
    });
  
    it('should allow tank movement', () => {
      cy.window().then((win) => {
        const playInstance = win.playInstance; // Assuming you attach the instance to the window for testing
        cy.wrap(playInstance).invoke('initializeTankMovement', playInstance, 0.02);
        // Simulate key press for 'w'
        cy.get('body').trigger('keydown', { key: 'w' });
        cy.wait(500);
        cy.get('body').trigger('keyup', { key: 'w' });
  
        // Check tank position
        //cy.wrap(playInstance.tank.position).should((pos) => {
        //  expect(pos.z).to.be.greaterThan(0);
        //});
      });
    });
  
    // Add more E2E tests
  });
  