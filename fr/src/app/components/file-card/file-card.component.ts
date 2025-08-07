import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FileItem {
  id: string;
  title: string;
  tags: string[];
  keywords: string[];
  content: string;
}

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-card.component.html',
  styleUrls: ['./file-card.component.scss']
})
export class FileCardComponent {
  @Input({ required: true }) fileItem!: FileItem;
  @Input() isSelected = false;
  @Input() isFavorite = false;
  @Input() searchQuery = '';
  @Input() lastModified = '';
  @Input() maxVisibleTags = 3;
  @Input() maxContentLength = 200;

  @Output() cardClick = new EventEmitter<FileItem>();
  @Output() favoriteClick = new EventEmitter<{ file: FileItem, isFavorite: boolean }>();
  @Output() tagClick = new EventEmitter<{ tag: string, file: FileItem }>();
  @Output() keywordClick = new EventEmitter<{ keyword: string, file: FileItem }>();
  @Output() viewClick = new EventEmitter<FileItem>();
  @Output() editClick = new EventEmitter<FileItem>();
  @Output() copyClick = new EventEmitter<FileItem>();
  @Output() shareClick = new EventEmitter<FileItem>();
  @Output() optionsClick = new EventEmitter<{ file: FileItem, event: MouseEvent }>();

  // Signals
  isExpanded = signal(false);
  showAllTags = signal(false);
  showFullContent = signal(false);

  // Computed properties
  truncatedTitle = computed(() => {
    const maxLength = 50;
    return this.fileItem.title.length > maxLength 
      ? this.fileItem.title.substring(0, maxLength) + '...'
      : this.fileItem.title;
  });

  visibleTags = computed(() => {
    return this.showAllTags() 
      ? this.fileItem.tags 
      : this.fileItem.tags.slice(0, this.maxVisibleTags);
  });

  contentStats = computed(() => {
    const content = this.fileItem.content;
    return {
      characters: content.length,
      words: content.trim() ? content.trim().split(/\s+/).length : 0,
      lines: content.split('\n').length
    };
  });

  highlightedContent = computed(() => {
    let content = this.fileItem.content;
    
    // Truncate content if not showing full
    if (!this.showFullContent() && content.length > this.maxContentLength) {
      content = content.substring(0, this.maxContentLength) + '...';
    }

    // Highlight search query if provided
    if (this.searchQuery.trim()) {
      const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
      content = content.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // Highlight keywords
    this.fileItem.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${this.escapeRegex(keyword)})\\b`, 'gi');
      content = content.replace(regex, '<span class="keyword-highlight">$1</span>');
    });

    return content;
  });

  isContentTruncated = computed(() => {
    return this.fileItem.content.length > this.maxContentLength;
  });

  // Event handlers
  onCardClick(): void {
    this.cardClick.emit(this.fileItem);
  }

  onFavoriteClick(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteClick.emit({ 
      file: this.fileItem, 
      isFavorite: !this.isFavorite 
    });
  }

  onTagClick(tag: string, event: MouseEvent): void {
    event.stopPropagation();
    this.tagClick.emit({ tag, file: this.fileItem });
  }

  onKeywordClick(keyword: string, event: MouseEvent): void {
    event.stopPropagation();
    this.keywordClick.emit({ keyword, file: this.fileItem });
  }

  onExpandClick(event: MouseEvent): void {
    event.stopPropagation();
    this.isExpanded.update(expanded => !expanded);
  }

  onOptionsClick(event: MouseEvent): void {
    event.stopPropagation();
    this.optionsClick.emit({ file: this.fileItem, event });
  }

  onViewClick(event: MouseEvent): void {
    event.stopPropagation();
    this.viewClick.emit(this.fileItem);
  }

  onEditClick(event: MouseEvent): void {
    event.stopPropagation();
    this.editClick.emit(this.fileItem);
  }

  onCopyClick(event: MouseEvent): void {
    event.stopPropagation();
    this.copyClick.emit(this.fileItem);
  }

  onShareClick(event: MouseEvent): void {
    event.stopPropagation();
    this.shareClick.emit(this.fileItem);
  }

  toggleAllTags(event: MouseEvent): void {
    event.stopPropagation();
    this.showAllTags.update(show => !show);
  }

  toggleFullContent(event: MouseEvent): void {
    event.stopPropagation();
    this.showFullContent.update(show => !show);
  }

  // Helper methods
  getFileIconClass(): string {
    // Return different classes based on file type or content
    const content = this.fileItem.content.toLowerCase();
    const title = this.fileItem.title.toLowerCase();
    
    if (title.includes('pdf') || content.includes('pdf')) return 'pdf-file';
    if (title.includes('doc') || content.includes('document')) return 'doc-file';
    if (title.includes('xls') || content.includes('excel')) return 'excel-file';
    if (title.includes('ppt') || content.includes('presentation')) return 'ppt-file';
    if (title.includes('img') || title.includes('image')) return 'image-file';
    if (title.includes('video') || title.includes('mp4')) return 'video-file';
    if (title.includes('audio') || title.includes('mp3')) return 'audio-file';
    
    return 'default-file';
  }

  getFileIcon(): string {
    const fileClass = this.getFileIconClass();
    
    switch (fileClass) {
      case 'pdf-file': return 'fas fa-file-pdf';
      case 'doc-file': return 'fas fa-file-word';
      case 'excel-file': return 'fas fa-file-excel';
      case 'ppt-file': return 'fas fa-file-powerpoint';
      case 'image-file': return 'fas fa-file-image';
      case 'video-file': return 'fas fa-file-video';
      case 'audio-file': return 'fas fa-file-audio';
      default: return 'fas fa-file-alt';
    }
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}