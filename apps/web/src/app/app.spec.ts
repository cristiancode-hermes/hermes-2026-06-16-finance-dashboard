import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let component: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
  });

  it('should create the app component', () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct title in template', () => {
    fixture.detectChanges();
    const navElement: HTMLElement = fixture.nativeElement;
    const title = navElement.querySelector('a')?.textContent;
    expect(title).toContain('Finance Dashboard');
  });

  it('should have navigation links', () => {
    fixture.detectChanges();
    const navLinks = fixture.nativeElement.querySelectorAll('a');
    const linkTexts = Array.from(navLinks).map((link: any) => link.textContent);
    expect(linkTexts).toContain('Dashboard');
    expect(linkTexts).toContain('Transactions');
    expect(linkTexts).toContain('Budgets');
    expect(linkTexts).toContain('Reports');
  });
});
