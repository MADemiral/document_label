import { Component, ElementRef, Input, OnInit, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DocumentStats {
  documentId: number;
  wordCount: number;
  characterCount: number;
  labelCount: number;
  summaryLength: number;
  contentLength: number;
  searchScore?: number;
}

@Component({
  selector: 'app-document-stats-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-stats-chart.component.html',
  styleUrls: ['./document-stats-chart.component.scss']
})
export class DocumentStatsChartComponent implements OnInit, OnChanges {
  @ViewChild('backgroundCanvas', { static: true }) backgroundCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statsCanvas', { static: true }) statsCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() documentStats: DocumentStats | null = null;
  @Input() title: string = 'Document Statistics';
  @Input() size: number = 400;
  @Input() primaryColor: string = 'rgba(59, 130, 246, 0.7)'; // Tailwind blue
  @Input() textColor: string = 'rgb(31, 41, 55)'; // Tailwind gray-800
  @Input() backgroundColor: string = 'rgb(55, 65, 81)'; // Tailwind gray-700

  private backgroundCtx!: CanvasRenderingContext2D;
  private statsCtx!: CanvasRenderingContext2D;
  private edge!: number;
  private animationId: number = 0;
  
  // Animation properties
  private currentStats: number[] = [5.1, 5.1, 5.1, 5.1, 5.1, 5.1];
  private targetStats: number[] = [0, 1, 3, 1, 1, 0];
  private tempStats: number[] = [0, 0, 0, 0, 0, 0];
  private animationProgress: number = 0;
  private animationSpeed: number = 0.02;

  ngOnInit() {
    this.initCanvases();
    this.drawBackground();
    if (this.documentStats) {
      this.updateChart();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documentStats'] && !changes['documentStats'].firstChange) {
      this.updateChart();
    }
  }

  private initCanvases() {
    const bgCanvas = this.backgroundCanvas.nativeElement;
    const statsCanvas = this.statsCanvas.nativeElement;
    
    bgCanvas.width = this.size * 1.01;
    bgCanvas.height = this.size * 1.01;
    statsCanvas.width = this.size * 1.01;
    statsCanvas.height = this.size * 1.01;
    
    this.backgroundCtx = bgCanvas.getContext('2d')!;
    this.statsCtx = statsCanvas.getContext('2d')!;
    this.edge = (this.size / Math.sqrt(3)) / 2;
  }

  private drawBackground() {
    const ctx = this.backgroundCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Shadow settings
    ctx.shadowBlur = 1;
    ctx.shadowOffsetX = this.size / 190;
    ctx.shadowOffsetY = this.size / 190;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';

    this.drawBackgroundCircles();
    this.drawLabels();
    this.drawLines();
    this.drawNotches();
    this.drawCategoryText();

    // Remove shadow for clean lines
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    this.drawBackgroundCircles();
  }

  private drawBackgroundCircles() {
    const ctx = this.backgroundCtx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const circles = [
      this.edge,
      this.edge * (19 / 12),
      this.edge * (19 / 12 + 10 / 78)
    ];

    ctx.strokeStyle = this.backgroundColor;
    ctx.lineWidth = this.size / 200;

    circles.forEach(radius => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }

  private drawLabels() {
    const ctx = this.backgroundCtx;
    const fontSize = this.size / 20;
    const x = (this.size / 2) + (this.size / 100);
    const y = this.size / 2;

    ctx.fillStyle = this.textColor;
    ctx.font = `${fontSize}px Arial`;

    const labels = ['A', 'B', 'C', 'D', 'E'];
    labels.forEach((label, i) => {
      ctx.fillText(label, x, y - (this.edge * (5 - i) / 6));
    });
  }

  private drawLines() {
    const ctx = this.backgroundCtx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const halfEdge = this.edge / 2;

    ctx.strokeStyle = this.backgroundColor;
    ctx.lineWidth = this.size / 300;
    ctx.beginPath();

    // Vertical line
    ctx.moveTo(centerX, centerY - this.edge);
    ctx.lineTo(centerX, centerY + this.edge);

    // Diagonal lines
    const diagX = this.pythagA(halfEdge, this.edge);
    ctx.moveTo(centerX + diagX, centerY + halfEdge);
    ctx.lineTo(centerX - diagX, centerY - halfEdge);
    ctx.moveTo(centerX + diagX, centerY - halfEdge);
    ctx.lineTo(centerX - diagX, centerY + halfEdge);

    ctx.stroke();
  }

  private drawNotches() {
    const ctx = this.backgroundCtx;
    // Simplified notch drawing - you can expand this based on the original
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    
    ctx.strokeStyle = this.backgroundColor;
    ctx.lineWidth = this.size / 300;
    
    // Draw simple notches around the circles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const innerRadius = this.edge * 0.9;
      const outerRadius = this.edge * 1.1;
      
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * outerRadius,
        centerY + Math.sin(angle) * outerRadius
      );
      ctx.stroke();
    }
  }

  private drawCategoryText() {
    const ctx = this.backgroundCtx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.edge * 1.8;
    const fontSize = this.size / 25;

    ctx.fillStyle = this.textColor;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';

    const categories = [
      'KELİME SAYISI',
      'KARAKTER SAYISI', 
      'ETİKET SAYISI',
      'ÖZET UZUNLUĞU',
      'İÇERİK UZUNLUĞU',
      'ARAMA SKORU'
    ];

    categories.forEach((category, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(category, 0, 0);
      ctx.restore();
    });
  }

  private updateChart() {
    if (!this.documentStats) return;

    // Convert document stats to normalized values (0-5 scale)
    const normalizedStats = this.normalizeStats(this.documentStats);
    
    this.currentStats = [...this.tempStats];
    this.targetStats = normalizedStats;
    this.animationProgress = 0;
    
    this.animate();
  }

  private normalizeStats(stats: DocumentStats): number[] {
    // Normalize different metrics to 0-5 scale
    return [
      this.normalizeValue(stats.wordCount, 0, 1000, true), // Word count
      this.normalizeValue(stats.characterCount, 0, 5000, true), // Character count
      this.normalizeValue(stats.labelCount, 0, 10, true), // Label count
      this.normalizeValue(stats.summaryLength, 0, 500, true), // Summary length
      this.normalizeValue(stats.contentLength, 0, 10000, true), // Content length
      this.normalizeValue(stats.searchScore || 0, 0, 1, true) // Search score
    ];
  }

  private normalizeValue(value: number, min: number, max: number, inverse: boolean = false): number {
    // Normalize to 0-1 range, then scale to 0-5 and optionally invert
    const normalized = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const scaled = normalized * 5;
    return inverse ? 5 - scaled : scaled;
  }

  private animate() {
    if (this.animationProgress < 1) {
      // Lerp between current and target stats
      for (let i = 0; i < 6; i++) {
        this.tempStats[i] = this.lerp(
          this.currentStats[i],
          this.targetStats[i],
          this.animationProgress
        );
      }

      this.drawStats();
      this.animationProgress += this.animationSpeed;
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.tempStats = [...this.targetStats];
      this.drawStats();
      cancelAnimationFrame(this.animationId);
    }
  }

  private drawStats() {
    const ctx = this.statsCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Shadow for stats
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 1;
    ctx.shadowOffsetX = this.size / 200;
    ctx.shadowOffsetY = this.size / 200;

    this.drawStatsPolygon();
    this.drawStatsLetters();
  }

  private drawStatsPolygon() {
    const ctx = this.statsCtx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const stats = this.tempStats;

    // Calculate hexagon points based on stats
    const points: [number, number][] = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const distance = this.edge * (1 - (stats[i] + 1) / 6); // Invert for chart
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      points.push([x, y]);
    }

    // Draw filled polygon
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();

    ctx.fillStyle = this.primaryColor;
    ctx.fill();
  }

  private drawStatsLetters() {
    const ctx = this.statsCtx;
    const fontSize = this.size / 15;

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';

    const letters = this.tempStats.map(stat => this.convertToLetter(stat));
    const positions = this.getLetterPositions();

    letters.forEach((letter, i) => {
      ctx.fillText(letter, positions[i][0], positions[i][1]);
    });
  }

  private getLetterPositions(): [number, number][] {
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.edge * 0.7;

    return [
      [centerX, centerY - radius], // Top
      [centerX + radius * 0.866, centerY - radius * 0.5], // Top right
      [centerX + radius * 0.866, centerY + radius * 0.5], // Bottom right
      [centerX, centerY + radius], // Bottom
      [centerX - radius * 0.866, centerY + radius * 0.5], // Bottom left
      [centerX - radius * 0.866, centerY - radius * 0.5], // Top left
    ];
  }

  private convertToLetter(value: number): string {
    if (value <= 0) return 'A';
    if (value <= 1) return 'B';
    if (value <= 2) return 'C';
    if (value <= 3) return 'D';
    if (value <= 4) return 'E';
    return '?';
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private pythagA(b: number, c: number): number {
    return Math.sqrt(Math.pow(c, 2) - Math.pow(b, 2));
  }

  // Public methods for external control
  setColors(primary: string, text: string, background: string) {
    this.primaryColor = primary;
    this.textColor = text;
    this.backgroundColor = background;
    this.drawBackground();
    this.drawStats();
  }

  exportAsImage(): string {
    // Combine both canvases and return as data URL
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = this.size;
    combinedCanvas.height = this.size;
    const combinedCtx = combinedCanvas.getContext('2d')!;

    combinedCtx.drawImage(this.backgroundCanvas.nativeElement, 0, 0);
    combinedCtx.drawImage(this.statsCanvas.nativeElement, 0, 0);

    return combinedCanvas.toDataURL('image/png');
  }
}
