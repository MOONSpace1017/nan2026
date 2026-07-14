import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.player = null;
    this.playerEars = [];
    this.playerLabel = null;

    this.keys = null;
    this.cursors = null;
    this.playerSpeed = 230;

    this.areas = [];
    this.currentArea = null;
    this.interactionText = null;
    this.inventoryOpen = false;
    this.inventoryOverlay = null;

    this.inventoryPanel = null;
    this.inventorySlots = [];

    // 마우스로 집고 있는 아이템
    this.heldInventoryItem = null;
    this.heldItemSourceSlot = null;

    this.heldItemContainer = null;
    this.heldItemIcon = null;
    this.heldItemCountText = null;

    // 쓰레기통과 아이템 삭제 확인창
    this.trashCanContainer = null;

    this.discardConfirmOpen = false;
    this.discardConfirmOverlay = null;
    this.discardConfirmPanel = null;
    this.discardConfirmText = null;

    // 나중에 제작할 기본 떡

    this.interactionMessageActive = false;

    // 각 슬롯이 아이템 종류와 개별 수량을 직접 저장
    this.inventoryData = Array(15).fill(null);

    // 처음에는 0번 슬롯에 씨앗 6개
    this.inventoryData[0] = {
      type: 'seed',
      count: 6,
    };
   
    // 여러 개의 밭을 저장할 배열
    this.farmPlots = [];
    this.nearestFarmPlot = null;

    // 테스트용 밀 성장 시간: 10초
    this.wheatGrowthTime = 10000;

    this.inventoryText = null;

    // 보유금
    this.money = 500;
    this.moneyText = null;
    this.shopMoneyText = null;

    // 떡방앗간 창
    this.millOpen = false;
    this.millOverlay = null;
    this.millPanel = null;
    this.millInventorySlots = [];

    this.millInputIcon = null;
    this.millInputCountText = null;

    this.millOutputIcon = null;
    this.millOutputCountText = null;

    this.millProgressFill = null;
    this.millProgressText = null;
    this.millNoticeText = null;

    // 제작 상태
    this.millCrafting = false;
    this.millCraftStartAt = 0;
    this.millCraftEndAt = 0;
    this.millCraftDuration = 5000;

    // 왼쪽 투입 슬롯에 들어간 아이템
    this.millInputType = null;

    // 왼쪽 투입 슬롯에 쌓인 밀 수량
    this.millInputCount = 0;

    // 오른쪽 결과 슬롯에 쌓인 떡 수량
    this.millOutputCount = 0;
    
    // 실제 보유금
    this.money = 500;
    this.moneyText = null;

    // 상점
    this.shopOpen = false;
    this.shopOverlay = null;
    this.shopPanel = null;

    this.shopPage = 0;
    this.shopItemsPerPage = 4;
    this.shopCards = [];

    this.shopPageText = null;
    this.shopMoneyText = null;
    this.shopNoticeText = null;

    // 거래 확인창
    this.shopConfirmOpen = false;
    this.shopConfirmOverlay = null;
    this.shopConfirmPanel = null;
    this.shopConfirmText = null;
    this.shopConfirmButton = null;
    this.shopConfirmButtonText = null;

    this.pendingShopTransaction = null;

    // 상점 상품
    this.shopItems = [
      {
        type: 'ricecake',
        name: '기본 떡',
        imageKey: 'tteok_basic',
        basePrice: 300,
        changePercent: 0,
      },
      {
        type: 'yellow_tteok',
        name: '노랑 달 떡',
        imageKey: 'tteok_yellow',
        basePrice: 600,
        changePercent: 12,
      },
      {
        type: 'brown_tteok',
        name: '갈색 달 떡',
        imageKey: 'tteok_brown',
        basePrice: 450,
        changePercent: -8,
      },
      {
        type: 'blue_tteok',
        name: '파랑 달 떡',
        imageKey: 'tteok_blue',
        basePrice: 520,
        changePercent: 5,
      },
      {
        type: 'red_tteok',
        name: '빨강 달 떡',
        imageKey: 'tteok_red',
        basePrice: 560,
        changePercent: -15,
      },
      {
        type: 'green_tteok',
        name: '초록 달 떡',
        imageKey: 'tteok_green',
        basePrice: 500,
        changePercent: 20,
      },
      {
        type: 'shining_tteok',
        name: '빛나는 떡',
        imageKey: 'tteok_shining',
        basePrice: 4000,
        changePercent: 0,
      },
    ];
  }

  get seedCount() {
    return this.getTotalItemCount('seed');
  }

  set seedCount(value) {
    this.setTotalItemCount('seed', value);
  }

  get wheatCount() {
    return this.getTotalItemCount('wheat');
  }

  set wheatCount(value) {
    this.setTotalItemCount('wheat', value);
  }

  get basicRiceCakeCount() {
    return this.getTotalItemCount('ricecake');
  }

  set basicRiceCakeCount(value) {
    this.setTotalItemCount('ricecake', value);
  }

  getTotalItemCount(type) {
    return this.inventoryData.reduce((total, stack) => {
      if (!stack || stack.type !== type) {
        return total;
      }

      return total + stack.count;
    }, 0);
  }

  setTotalItemCount(type, newCount) {
    const safeCount = Math.max(0, newCount);
    const currentCount = this.getTotalItemCount(type);
    const difference = safeCount - currentCount;

    if (difference > 0) {
      this.addItemToInventory(type, difference);
    } else if (difference < 0) {
      this.removeItemFromInventory(type, -difference);
    }
  }

  addItemToInventory(type, count) {
    if (count <= 0) {
      return true;
    }

    // 같은 아이템이 있으면 기존 묶음에 추가
    const existingStack = this.inventoryData.find(
      (stack) => stack && stack.type === type,
    );

    if (existingStack) {
      existingStack.count += count;
      return true;
    }

    // 같은 아이템이 없으면 빈칸에 새 묶음 생성
    const emptyIndex = this.inventoryData.findIndex(
      (stack) => stack === null,
    );

    if (emptyIndex === -1) {
      return false;
    }

    this.inventoryData[emptyIndex] = {
      type,
      count,
    };

    return true;
  }

  removeItemFromInventory(type, count) {
    let remaining = count;

    // 뒤쪽 슬롯부터 차례대로 감소
    for (
      let i = this.inventoryData.length - 1;
      i >= 0 && remaining > 0;
      i -= 1
    ) {
      const stack = this.inventoryData[i];

      if (!stack || stack.type !== type) {
        continue;
      }

      const removedCount = Math.min(
        stack.count,
        remaining,
      );

      stack.count -= removedCount;
      remaining -= removedCount;

      if (stack.count <= 0) {
        this.inventoryData[i] = null;
      }
    }

    return remaining === 0;
  }

  preload() {
    this.load.image(
      'tteok_basic',
      '/assets/images/items/tteok/basic_tteok.png',
    );

    this.load.image(
      'tteok_yellow',
      '/assets/images/items/tteok/yellow_tteok.png',
    );

    this.load.image(
      'tteok_brown',
      '/assets/images/items/tteok/brown_tteok.png',
    );

    this.load.image(
      'tteok_blue',
      '/assets/images/items/tteok/blue_tteok.png',
    );

    this.load.image(
      'tteok_red',
      '/assets/images/items/tteok/red_tteok.png',
    );

    this.load.image(
      'tteok_green',
      '/assets/images/items/tteok/green_tteok.png',
    );

    this.load.image(
      'tteok_shining',
      '/assets/images/items/tteok/shining_tteok.png',
    );
  }



  create() {
     console.log(
      'tteok_basic 등록 여부:',
      this.textures.exists('tteok_basic'),
    );

    this.createWorld();
    this.createAreas();
    this.createFarmSystem();
    this.createPlayer();
    this.createInput();
    this.createHUD();
    this.createInventoryPanel();
    this.createRiceCakeMillPanel();
    this.createShopPanel();

    this.physics.world.setBounds(0, 0, 1280, 720);
  }

  createWorld() {
    this.cameras.main.setBackgroundColor('#18233b');

    // 달 표면
    this.add
      .rectangle(640, 360, 1240, 680, 0xd7d5c9)
      .setStrokeStyle(6, 0x91918d);

    // 길
    this.add.rectangle(640, 360, 1200, 100, 0xa9a79e);
    this.add.rectangle(640, 360, 100, 640, 0xa9a79e);

    // 달 표면 장식
    for (let i = 0; i < 25; i += 1) {
      const x = Phaser.Math.Between(40, 1240);
      const y = Phaser.Math.Between(40, 680);
      const radius = Phaser.Math.Between(5, 18);

      this.add.circle(x, y, radius, 0xbebcb2, 0.45);
    }
  }

  createAreas() {
    this.createArea({
      x: 250,
      y: 185,
      width: 300,
      height: 210,
      color: 0x8f704f,
      name: '농장',
      description: '밭 가까이에서 씨앗을 심고 수확하세요',
      nameY: 130,
      descriptionY: 170,
    });

    this.createArea({
      x: 1030,
      y: 185,
      width: 300,
      height: 210,
      color: 0xb48762,
      name: '달토끼의 집',
      description: '창고와 냉장고를 사용하는 장소',
    });

    this.createArea({
      x: 250,
      y: 550,
      width: 300,
      height: 210,
      color: 0x5f8aa8,
      name: '상점',
      description: '도구와 씨앗을 구매하는 장소',
    });

    this.createArea({
      x: 1030,
      y: 550,
      width: 300,
      height: 210,
      color: 0xc79f64,
      name: '떡방앗간',
      description: '밀과 재료로 떡을 만드는 장소',
    });
  }

  createArea({
    x,
    y,
    width,
    height,
    color,
    name,
    description,
    nameY = y - 25,
    descriptionY = y + 25,
  }) {
    const area = this.add.rectangle(x, y, width, height, color);

    area.setStrokeStyle(5, 0xffffff, 0.8);

    this.add
      .text(x, nameY, name, {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(x, descriptionY, description, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.areas.push({
      object: area,
      name,
      description,
    });
  }

  createFarmSystem() {
    // 농장 안에 6개의 밭 생성
    const plotPositions = [
      { x: 165, y: 220 },
      { x: 250, y: 220 },
      { x: 335, y: 220 },

      { x: 165, y: 265 },
      { x: 250, y: 265 },
      { x: 335, y: 265 },
    ];

    plotPositions.forEach((position, index) => {
      const rectangle = this.add
        .rectangle(position.x, position.y, 70, 32, 0x62452f)
        .setStrokeStyle(2, 0xe2c28b);

      const statusText = this.add
        .text(position.x, position.y, '빈 밭', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center',
        })
        .setOrigin(0.5);

      this.farmPlots.push({
        id: index,
        rectangle,
        statusText,

        // empty / growing / ready
        state: 'empty',

        // 이 밭의 밀이 다 자라는 시각
        readyAt: 0,
      });
    });
  }

  createPlayer() {
    this.player = this.add.rectangle(640, 360, 42, 52, 0xffffff);

    this.player.setStrokeStyle(4, 0x56627a);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    const leftEar = this.add.ellipse(628, 323, 13, 35, 0xffffff);
    const rightEar = this.add.ellipse(652, 323, 13, 35, 0xffffff);

    this.playerEars = [leftEar, rightEar];

    this.playerLabel = this.add
      .text(640, 394, '달토끼', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#1b2438',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,

      // 상호작용
      interact: Phaser.Input.Keyboard.KeyCodes.SPACE,

      // 인벤토리
      inventory: Phaser.Input.Keyboard.KeyCodes.E,

      // 창 닫기
      close: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    // 스페이스바를 눌렀을 때 브라우저 화면이 움직이는 것을 방지
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.ESC,
    ]);

    // 게임에서 우클릭할 때 브라우저 메뉴가 뜨지 않게 함  
    this.input.mouse.disableContextMenu();  
  }

  createHUD() {
    const hudBackground = this.add.rectangle(
      640,
      35,
      1240,
      55,
      0x111827,
      0.92,
    );

    hudBackground.setScrollFactor(0);

    this.add
      .text(40, 35, '1일차', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.moneyText = this.add
      .text(190, 35, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffe07a',
      })
      .setOrigin(0, 0.5);

    this.updateMoneyHUD();

    this.add
      .text(430, 35, '오늘의 집세: 100원', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffb0b0',
      })
      .setOrigin(0, 0.5);

    this.inventoryText = this.add
      .text(710, 35, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#c9f2a7',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.updateInventoryHUD();

    this.add
      .text(1240, 35,
      '이동: WASD | 상호작용: SPACE | 인벤토리: E',
      {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#d5d9e2',
      })
      .setOrigin(1, 0.5);

    this.interactionText = this.add
      .text(640, 670, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#111827',
        align: 'center',
        padding: {
          x: 18,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setVisible(false);
  }
  updateMoneyHUD() {
    if (this.moneyText) {
      this.moneyText.setText(
        `보유금: ${this.money.toLocaleString()}원`,
      );
    }

    if (this.shopMoneyText) {
      this.shopMoneyText.setText(
        `보유금: ${this.money.toLocaleString()}원`,
      );
    }
  }

  createInventoryPanel() {
    this.inventoryOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.45)
      .setDepth(99)
      .setScrollFactor(0)
      .setVisible(false);
    this.inventoryOverlay.setInteractive();

    this.inventoryOverlay.on('pointerdown', () => {
      // 삭제 확인창이 열려 있을 때는 작동하지 않음
      if (this.discardConfirmOpen) {
        return;
      }

      // 바깥에 놓으면 삭제하지 않고 원래 칸으로 복귀
      if (this.heldInventoryItem) {
        this.releaseHeldInventoryItem();
      }
    });

    const background = this.add
      .rectangle(0, 0, 760, 520, 0x1b2338, 0.98)
      .setStrokeStyle(6, 0xe8d9a5);
    
    background.setInteractive();

    background.on('pointerdown', () => {
    if (this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }
  });

    const title = this.add
      .text(0, -215, '인벤토리', {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const divider = this.add
      .rectangle(0, -175, 620, 4, 0xe8d9a5);

    const guideText = this.add
      .text(
        0,
        225,
        '[E] 닫기 | 바깥 클릭: 원래 자리 | 쓰레기통: 삭제',
        {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#d1d5db',
        },
      )
      .setOrigin(0.5);
    // 쓰레기통 배경
    const trashBackground = this.add
      .rectangle(0, 0, 92, 82, 0x6b1d1d, 0.98)
      .setStrokeStyle(3, 0xfca5a5);

    // 쓰레기통 뚜껑
    const trashLid = this.add.rectangle(
      0,
      -22,
      48,
      7,
      0xe5e7eb,
    );

    // 쓰레기통 손잡이
    const trashHandle = this.add.rectangle(
      0,
      -29,
      20,
      6,
      0xe5e7eb,
    );

    // 쓰레기통 몸통
    const trashBody = this.add
      .rectangle(0, 2, 40, 40, 0xd1d5db)
      .setStrokeStyle(2, 0x6b7280);

    // 쓰레기통 세로선
    const trashLine1 = this.add.rectangle(
      -9,
      2,
      3,
      27,
      0x6b7280,
    );

    const trashLine2 = this.add.rectangle(
      9,
      2,
      3,
      27,
      0x6b7280,
    );

    const trashText = this.add
      .text(0, 32, '삭제', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 실제 마우스 클릭 영역
    const trashHitArea = this.add
      .rectangle(0, 0, 92, 82, 0xffffff, 0)
      .setInteractive({
        useHandCursor: true,
      });

    this.trashCanContainer = this.add.container(
      310,
      145,
      [
        trashBackground,
        trashLid,
        trashHandle,
        trashBody,
        trashLine1,
        trashLine2,
        trashText,
        trashHitArea,
      ],
    );

    // 마우스를 올렸을 때 강조
    trashHitArea.on('pointerover', () => {
      trashBackground.setStrokeStyle(5, 0xfff2a8);
      this.trashCanContainer.setScale(1.06);
    });

    trashHitArea.on('pointerout', () => {
      trashBackground.setStrokeStyle(3, 0xfca5a5);
      this.trashCanContainer.setScale(1);
    });

    // 아이템을 들고 쓰레기통 클릭
    trashHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (this.discardConfirmOpen) {
          return;
        }

        // 아이템을 들고 있지 않으면 아무 일도 없음
        if (!this.heldInventoryItem) {
          return;
        }

        this.openDiscardConfirmation();
      },
    );  
    const children = [
      background,
      title,
      divider,
      guideText,
      this.trashCanContainer,
    ];

    this.inventorySlots = [];

    const cols = 5;
    const rows = 3;
    const slotSize = 88;
    const gap = 18;

    const startX = -((cols - 1) * (slotSize + gap)) / 2;
    const startY = -95;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * (slotSize + gap);
        const y = startY + row * (slotSize + gap);

        const outer = this.add
          .rectangle(0, 0, slotSize, slotSize, 0x8b8f99)
          .setStrokeStyle(3, 0xe5e7eb);

        const inner = this.add
          .rectangle(0, 0, slotSize - 8, slotSize - 8, 0xc7c9cf);

        const icon = this.add.graphics();
        const itemImage = this.add
          .image(0, 0, 'tteok_basic')
          .setDisplaySize(60, 60)
          .setVisible(false);
        const countText = this.add
          .text(28, 28, '', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#111827',
            fontStyle: 'bold',
          })
          .setOrigin(1, 1);

        const emptyMark = this.add
          .text(0, 0, '', {
            fontFamily: 'sans-serif',
            fontSize: '14px',
            color: '#6b7280',
          })
          .setOrigin(0.5);

       const slotContainer = this.add.container(x, y, [
        outer,
        inner,
        icon,
        itemImage,
        countText,
        emptyMark,
      ]);

        children.push(slotContainer);

        const slotData = {
          // 0번부터 14번까지 슬롯 번호
          index: row * cols + col,

          container: slotContainer,
          outer,
          inner,
          icon,
          itemImage,
          countText,
          emptyMark,

          item: null,
        };

        // 마우스 입력을 받을 수 있도록 설정
        inner.setInteractive({
          useHandCursor: true,
        });

        // 아이템 위에 마우스를 올렸을 때
        inner.on('pointerover', () => {
          if (!slotData.item || this.heldInventoryItem) {
            return;
          }

          slotData.outer.setStrokeStyle(4, 0xfff2a8);

          this.tweens.add({
            targets: slotData.container,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 80,
          });
        });

        // 마우스가 아이템에서 벗어났을 때
        inner.on('pointerout', () => {
          if (this.heldItemSourceSlot === slotData) {
            return;
          }

          slotData.outer.setStrokeStyle(3, 0xe5e7eb);

          this.tweens.add({
            targets: slotData.container,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
          });
        });

        // 마우스를 눌러 아이템 집기
        inner.on('pointerdown', (pointer) => {
          this.handleInventorySlotClick(slotData, pointer);
        });

        this.inventorySlots.push(slotData);
      }
    }

    this.inventoryPanel = this.add.container(640, 360, children);

    this.inventoryPanel
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    // 마우스로 집었을 때 표시할 아이템 생성
    this.createHeldItemPreview();
    this.createDiscardConfirmation();

    // 마우스를 움직이면 집은 아이템도 따라 움직임
    this.input.on('pointermove', (pointer) => {
      this.moveHeldInventoryItem(pointer);
    });

    

    this.updateInventoryPanel();
  }

  createRiceCakeMillPanel() {
    // 떡방앗간 바깥의 어두운 화면
    this.millOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.55)
      .setDepth(199)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    // 바깥에 아이템을 놓으면 삭제하지 않고 원래 슬롯으로 복귀
    this.millOverlay.on('pointerdown', () => {
      if (this.heldInventoryItem) {
        this.releaseHeldInventoryItem();
      }
    });

    const panelBackground = this.add
      .rectangle(0, 0, 900, 680, 0x241d2f, 0.99)
      .setStrokeStyle(6, 0xe8d9a5)
      .setInteractive();

    // 패널의 빈 공간을 클릭하면 들던 아이템을 원래 자리로
    panelBackground.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (this.heldInventoryItem) {
          this.releaseHeldInventoryItem();
        }
      },
    );

    const title = this.add
      .text(0, -300, '달토끼 떡방앗간', {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const description = this.add
      .text(
        0,
        -258,
        '인벤토리의 밀을 클릭한 뒤 왼쪽 재료 슬롯에 넣으세요.',
        {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          color: '#d1d5db',
        },
      )
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // 왼쪽 재료 슬롯
    // -------------------------------------------------------------------------

    const inputOuter = this.add
      .rectangle(-190, -155, 110, 110, 0x8b8f99)
      .setStrokeStyle(4, 0xfde68a);

    const inputInner = this.add
      .rectangle(-190, -155, 98, 98, 0xc7c9cf);

    this.millInputIcon = this.add.graphics();

    this.millInputIcon.setPosition(-190, -155);

    this.millInputCountText = this.add
      .text(-155, -120, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#111827',
        fontStyle: 'bold',
      })
      .setOrigin(1, 1);

    const inputLabel = this.add
      .text(-190, -88, '재료 투입', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const inputHitArea = this.add
      .rectangle(-190, -155, 110, 110, 0xffffff, 0)
      .setInteractive({
        useHandCursor: true,
      });

    inputHitArea.on('pointerover', () => {
      inputOuter.setStrokeStyle(6, 0xffffff);
    });

    inputHitArea.on('pointerout', () => {
      inputOuter.setStrokeStyle(4, 0xfde68a);
    });

    inputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleMillInputClick(pointer);
      },
    );

    // -------------------------------------------------------------------------
    // 가운데 화살표
    // -------------------------------------------------------------------------

    const arrow = this.add
      .text(0, -155, '→', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // 오른쪽 결과 슬롯
    // -------------------------------------------------------------------------

    const outputOuter = this.add
      .rectangle(190, -155, 110, 110, 0x8b8f99)
      .setStrokeStyle(4, 0x86efac);

    const outputInner = this.add
      .rectangle(190, -155, 98, 98, 0xc7c9cf);

    this.millOutputIcon = this.add.graphics();

    this.millOutputIcon.setPosition(190, -155);

    this.millOutputCountText = this.add
      .text(225, -120, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#111827',
        fontStyle: 'bold',
      })
      .setOrigin(1, 1);

    const outputLabel = this.add
      .text(190, -88, '완성된 떡', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const outputHitArea = this.add
      .rectangle(190, -155, 110, 110, 0xffffff, 0)
      .setInteractive({
        useHandCursor: true,
      });

    outputHitArea.on('pointerover', () => {
      outputOuter.setStrokeStyle(6, 0xffffff);
    });

    outputHitArea.on('pointerout', () => {
      outputOuter.setStrokeStyle(4, 0x86efac);
    });

    outputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleMillOutputClick();
      },
    );

    // -------------------------------------------------------------------------
    // 제작 진행도
    // -------------------------------------------------------------------------

    this.add.rectangle(
      0,
      -63,
      300,
      18,
      0x111827,
    );

    this.millProgressFill = this.add
      .rectangle(
        -150,
        -63,
        300,
        14,
        0xf4d35e,
      )
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    this.millProgressText = this.add
      .text(0, -40, '밀을 넣으면 제작이 시작됩니다.', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.millNoticeText = this.add
      .text(0, -10, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const divider = this.add.rectangle(
      0,
      20,
      760,
      4,
      0xe8d9a5,
    );

    const inventoryTitle = this.add
      .text(0, 47, '플레이어 인벤토리', {
        fontFamily: 'sans-serif',
        fontSize: '23px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const children = [
      panelBackground,
      title,
      description,

      inputOuter,
      inputInner,
      this.millInputIcon,
      this.millInputCountText,
      inputLabel,
      inputHitArea,

      arrow,

      outputOuter,
      outputInner,
      this.millOutputIcon,
      this.millOutputCountText,
      outputLabel,
      outputHitArea,

      this.millProgressFill,
      this.millProgressText,
      this.millNoticeText,

      divider,
      inventoryTitle,
    ];

    // -------------------------------------------------------------------------
    // 떡방앗간 아래쪽 플레이어 인벤토리 15칸
    // -------------------------------------------------------------------------

    this.millInventorySlots = [];

    const cols = 5;
    const rows = 3;
    const slotSize = 82;
    const gap = 14;

    const startX =
      -((cols - 1) * (slotSize + gap)) / 2;

    const startY = 105;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * (slotSize + gap);
        const y = startY + row * (slotSize + gap);

        const outer = this.add
          .rectangle(0, 0, slotSize, slotSize, 0x8b8f99)
          .setStrokeStyle(3, 0xe5e7eb);

        const inner = this.add
          .rectangle(
            0,
            0,
            slotSize - 8,
            slotSize - 8,
            0xc7c9cf,
          )
          .setInteractive({
            useHandCursor: true,
          });

        const icon = this.add.graphics();
        
        const itemImage = this.add
          .image(0, 0, 'tteok_basic')
          .setDisplaySize(56, 56)
          .setVisible(false);

        const countText = this.add
          .text(27, 27, '', {
            fontFamily: 'sans-serif',
            fontSize: '17px',
            color: '#111827',
            fontStyle: 'bold',
          })
          .setOrigin(1, 1);

        const slotContainer = this.add.container(
          x,
          y,
          [
            outer,
            inner,
            itemImage,
            icon,
            countText,
          ],
        );

        children.push(slotContainer);

        const slotData = {
          index: row * cols + col,
          container: slotContainer,
          outer,
          inner,
          itemImage,
          icon,
          countText,
          item: null,
        };

        inner.on('pointerover', () => {
          if (this.heldInventoryItem) {
            outer.setStrokeStyle(4, 0x86efac);
            return;
          }

          if (!slotData.item) {
            return;
          }

          outer.setStrokeStyle(4, 0xfff2a8);

          this.tweens.add({
            targets: slotContainer,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 80,
          });
        });

        inner.on('pointerout', () => {
          if (this.heldItemSourceSlot === slotData) {
            return;
          }

          outer.setStrokeStyle(3, 0xe5e7eb);

          this.tweens.add({
            targets: slotContainer,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
          });
        });

        inner.on(
          'pointerdown',
          (pointer, localX, localY, event) => {
            event?.stopPropagation();

            this.handleInventorySlotClick(
              slotData,
              pointer,
            );
          },
        );

        this.millInventorySlots.push(slotData);
      }
    }

    const closeGuide = this.add
      .text(0, 320, '[E] 떡방앗간 닫기', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#d1d5db',
      })
      .setOrigin(0.5);

    children.push(closeGuide);

    this.millPanel = this.add.container(
      640,
      360,
      children,
    );

    this.millPanel
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);

    this.updateInventoryPanel();
    this.updateMillMachineSlots();
  }

  createShopPanel() {
    this.shopOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.58)
      .setDepth(299)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    this.shopOverlay.on('pointerdown', () => {
      if (!this.shopConfirmOpen) {
        this.closeShop();
      }
    });

    const background = this.add
      .rectangle(0, 0, 1080, 650, 0x172033, 0.99)
      .setStrokeStyle(6, 0xf4d8a5)
      .setInteractive();

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      },
    );

    const title = this.add
      .text(0, -285, '달나라 떡 상점', {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.shopMoneyText = this.add
      .text(-480, -282, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffe07a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.shopPageText = this.add
      .text(480, -282, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#d1d5db',
      })
      .setOrigin(1, 0.5);

    this.shopNoticeText = this.add
      .text(0, 250, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const children = [
      background,
      title,
      this.shopMoneyText,
      this.shopPageText,
      this.shopNoticeText,
    ];

    const positions = [
      { x: -255, y: -125 },
      { x: 255, y: -125 },
      { x: -255, y: 105 },
      { x: 255, y: 105 },
    ];

    this.shopCards = [];

    positions.forEach((position) => {
      const cardBackground = this.add
        .rectangle(0, 0, 470, 205, 0x28344d)
        .setStrokeStyle(3, 0x8191b3);

      const icon = this.add
        .image(-155, -5, 'tteok_basic')
        .setDisplaySize(125, 125);

      const nameText = this.add
        .text(-65, -72, '', {
          fontFamily: 'sans-serif',
          fontSize: '23px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);

      const priceText = this.add
        .text(-65, -32, '', {
          fontFamily: 'sans-serif',
          fontSize: '19px',
          color: '#ffe07a',
        })
        .setOrigin(0, 0.5);

      const changeText = this.add
        .text(190, -32, '', {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);

      const ownedText = this.add
        .text(-65, 3, '', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#cbd5e1',
        })
        .setOrigin(0, 0.5);

      const buyButton = this.add
        .rectangle(-45, 60, 145, 48, 0x2563eb)
        .setStrokeStyle(2, 0x93c5fd)
        .setInteractive({ useHandCursor: true });

      const buyText = this.add
        .text(-45, 60, '구매', {
          fontFamily: 'sans-serif',
          fontSize: '19px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const sellButton = this.add
        .rectangle(125, 60, 145, 48, 0x15803d)
        .setStrokeStyle(2, 0x86efac)
        .setInteractive({ useHandCursor: true });

      const sellText = this.add
        .text(125, 60, '판매', {
          fontFamily: 'sans-serif',
          fontSize: '19px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const cardContainer = this.add.container(
        position.x,
        position.y,
        [
          cardBackground,
          icon,
          nameText,
          priceText,
          changeText,
          ownedText,
          buyButton,
          buyText,
          sellButton,
          sellText,
        ],
      );

      const card = {
        container: cardContainer,
        icon,
        nameText,
        priceText,
        changeText,
        ownedText,
        buyButton,
        sellButton,
        item: null,
      };

      buyButton.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();

          if (card.item) {
            this.requestShopTransaction(
              card.item,
              'buy',
            );
          }
        },
      );

      sellButton.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();

          if (card.item) {
            this.requestShopTransaction(
              card.item,
              'sell',
            );
          }
        },
      );

      children.push(cardContainer);
      this.shopCards.push(card);
    });

    const previousButton = this.add
      .rectangle(-155, 290, 180, 54, 0x4b5563)
      .setStrokeStyle(2, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const previousText = this.add
      .text(-155, 290, '◀ 이전', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const nextButton = this.add
      .rectangle(155, 290, 180, 54, 0x4b5563)
      .setStrokeStyle(2, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const nextText = this.add
      .text(155, 290, '다음 ▶', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    previousButton.on('pointerdown', () => {
      this.changeShopPage(-1);
    });

    nextButton.on('pointerdown', () => {
      this.changeShopPage(1);
    });

    children.push(
      previousButton,
      previousText,
      nextButton,
      nextText,
    );

    this.shopPanel = this.add.container(
      640,
      360,
      children,
    );

    this.shopPanel
      .setDepth(300)
      .setScrollFactor(0)
      .setVisible(false);

    this.createShopConfirmation();
    this.updateShopPage();
  }
  getShopPrice(item) {
    return Math.max(
      1,
      Math.round(
        item.basePrice *
        (1 + item.changePercent / 100),
      ),
    );
  }

  changeShopPage(direction) {
    const pageCount = Math.ceil(
      this.shopItems.length /
      this.shopItemsPerPage,
    );

    this.shopPage =
      (this.shopPage + direction + pageCount) %
      pageCount;

    this.updateShopPage();
  }

  updateShopPage() {
    if (!this.shopCards.length) {
      return;
    }

    const pageCount = Math.ceil(
      this.shopItems.length /
      this.shopItemsPerPage,
    );

    this.shopPageText.setText(
      `${this.shopPage + 1} / ${pageCount}`,
    );

    this.updateMoneyHUD();

    const start =
      this.shopPage *
      this.shopItemsPerPage;

    this.shopCards.forEach((card, index) => {
      const item = this.shopItems[start + index];

      card.item = item || null;
      card.container.setVisible(Boolean(item));

      if (!item) {
        return;
      }

      const price = this.getShopPrice(item);
      const owned = this.getTotalItemCount(item.type);

      card.icon.setTexture(item.imageKey);
      card.nameText.setText(item.name);

      card.priceText.setText(
        `${price.toLocaleString()}원`,
      );

      const sign =
        item.changePercent > 0 ? '+' : '';

      card.changeText.setText(
        `(${sign}${item.changePercent}%)`,
      );

      if (item.changePercent > 0) {
        card.changeText.setColor('#86efac');
      } else if (item.changePercent < 0) {
        card.changeText.setColor('#fca5a5');
      } else {
        card.changeText.setColor('#d1d5db');
      }

      card.ownedText.setText(
        `보유: ${owned}개`,
      );
    });
  }

  createShopConfirmation() {
    this.shopConfirmOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.75)
      .setDepth(500)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    this.shopConfirmOverlay.on('pointerdown', () => {
      this.cancelShopTransaction();
    });

    const background = this.add
      .rectangle(0, 0, 540, 330, 0x1f2937)
      .setStrokeStyle(5, 0xf4d8a5)
      .setInteractive();

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      },
    );

    const title = this.add
      .text(0, -120, '거래 확인', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.shopConfirmText = this.add
      .text(0, -25, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
        wordWrap: {
          width: 470,
        },
      })
      .setOrigin(0.5);

    const cancelButton = this.add
      .rectangle(-120, 112, 180, 58, 0x4b5563)
      .setStrokeStyle(3, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const cancelText = this.add
      .text(-120, 112, '취소', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.shopConfirmButton = this.add
      .rectangle(120, 112, 180, 58, 0x2563eb)
      .setStrokeStyle(3, 0x93c5fd)
      .setInteractive({ useHandCursor: true });

    this.shopConfirmButtonText = this.add
      .text(120, 112, '확인', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    cancelButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.cancelShopTransaction();
      },
    );

    this.shopConfirmButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.confirmShopTransaction();
      },
    );

    this.shopConfirmPanel = this.add.container(
      640,
      360,
      [
        background,
        title,
        this.shopConfirmText,
        cancelButton,
        cancelText,
        this.shopConfirmButton,
        this.shopConfirmButtonText,
      ],
    );

    this.shopConfirmPanel
      .setDepth(510)
      .setScrollFactor(0)
      .setVisible(false);
  }

  requestShopTransaction(item, action) {
    const requestedQuantity =
      this.keys.shift.isDown ? 10 : 1;

    const price = this.getShopPrice(item);
    let quantity = requestedQuantity;
    let canExecute = true;
    let reason = '';

    if (action === 'sell') {
      const owned =
        this.getTotalItemCount(item.type);

      if (owned <= 0) {
        quantity = 0;
        canExecute = false;
        reason = '판매할 아이템이 없습니다.';
      } else {
        quantity = Math.min(
          requestedQuantity,
          owned,
        );
      }
    }

    const totalPrice = price * quantity;

    if (
      action === 'buy' &&
      this.money < totalPrice
    ) {
      canExecute = false;
      reason = '보유금이 부족합니다.';
    }

    if (
      action === 'buy' &&
      !this.canAddShopItem(item.type)
    ) {
      canExecute = false;
      reason = '인벤토리에 빈칸이 없습니다.';
    }

    this.pendingShopTransaction = {
      item,
      action,
      quantity,
      totalPrice,
      canExecute,
    };

    const actionText =
      action === 'buy' ? '구매' : '판매';

    const resultMoney =
      action === 'buy'
        ? this.money - totalPrice
        : this.money + totalPrice;

    const lines = [
      `${item.name} ${quantity}개를`,
      `${actionText}하시겠습니까?`,
      '',
      `거래 금액: ${totalPrice.toLocaleString()}원`,
    ];

    if (canExecute) {
      lines.push(
        `거래 후 보유금: ${resultMoney.toLocaleString()}원`,
      );
    } else {
      lines.push('', reason);
    }

    this.shopConfirmText.setText(lines);

    this.shopConfirmButtonText.setText(
      canExecute ? '확인' : '거래 불가',
    );

    this.shopConfirmButton.setFillStyle(
      canExecute ? 0x2563eb : 0x6b7280,
    );

    this.shopConfirmOpen = true;
    this.shopConfirmOverlay.setVisible(true);
    this.shopConfirmPanel.setVisible(true);
  }

  canAddShopItem(type) {
    const sameStack =
      this.inventoryData.some(
        (stack) => stack && stack.type === type,
      );

    const emptySlot =
      this.inventoryData.some(
        (stack) => stack === null,
      );

    return sameStack || emptySlot;
  }

  confirmShopTransaction() {
    const transaction =
      this.pendingShopTransaction;

    if (
      !transaction ||
      !transaction.canExecute
    ) {
      return;
    }

    const {
      item,
      action,
      quantity,
      totalPrice,
    } = transaction;

    if (action === 'buy') {
      this.money -= totalPrice;

      this.addItemToInventory(
        item.type,
        quantity,
      );
    } else {
      const removed =
        this.removeItemFromInventory(
          item.type,
          quantity,
        );

      if (!removed) {
        this.showShopNotice(
          '판매할 수량이 부족합니다.',
        );
        return;
      }

      this.money += totalPrice;
    }

    this.closeShopConfirmation();
    this.updateMoneyHUD();
    this.updateInventoryHUD();
    this.updateShopPage();

    const actionText =
      action === 'buy' ? '구매' : '판매';

    this.showShopNotice(
      `${item.name} ${quantity}개를 ${actionText}했습니다.`,
    );
  }

  cancelShopTransaction() {
    if (!this.shopConfirmOpen) {
      return;
    }

    this.closeShopConfirmation();
  }

  closeShopConfirmation() {
    this.shopConfirmOpen = false;
    this.pendingShopTransaction = null;

    this.shopConfirmOverlay.setVisible(false);
    this.shopConfirmPanel.setVisible(false);
  }

  showShopNotice(message, duration = 1500) {
    if (!this.shopNoticeText) {
      return;
    }

    this.shopNoticeText.setText(message);

    this.time.delayedCall(duration, () => {
      if (this.shopNoticeText) {
        this.shopNoticeText.setText('');
      }
    });
  }

  openShop() {
    if (
      this.inventoryOpen ||
      this.millOpen
    ) {
      return;
    }

    this.shopOpen = true;
    this.shopPage = 0;

    this.player.body.setVelocity(0);
    this.interactionText.setVisible(false);

    this.shopOverlay.setVisible(true);
    this.shopPanel.setVisible(true);

    this.updateShopPage();
  }

  closeShop() {
    if (this.shopConfirmOpen) {
      this.cancelShopTransaction();
    }

    this.shopOpen = false;

    this.shopOverlay.setVisible(false);
    this.shopPanel.setVisible(false);
  }

  openRiceCakeMill() {
    if (this.inventoryOpen) {
      return;
    }

    this.millOpen = true;

    this.player.body.setVelocity(0);
    this.interactionText.setVisible(false);

    this.millOverlay.setVisible(true);
    this.millPanel.setVisible(true);

    this.updateInventoryPanel();
    this.updateMillMachineSlots();
  }

  closeRiceCakeMill() {
    if (this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }

    this.millOpen = false;

    this.millOverlay.setVisible(false);
    this.millPanel.setVisible(false);
  }

  handleMillInputClick(pointer) {
    // 좌클릭과 우클릭만 허용
    if (pointer.button !== 0 && pointer.button !== 2) {
      return;
    }

    if (!this.heldInventoryItem || !this.heldItemSourceSlot) {
      this.showMillNotice(
        '아래 인벤토리에서 밀을 먼저 클릭하세요.',
      );
      return;
    }

    if (this.heldInventoryItem.type !== 'wheat') {
      this.showMillNotice(
        '기본 떡의 재료로는 밀만 넣을 수 있습니다.',
      );
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;
    const sourceStack = this.inventoryData[sourceIndex];

    if (
      !sourceStack ||
      sourceStack.type !== 'wheat' ||
      sourceStack.count <= 0
    ) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();

      this.showMillNotice('투입할 밀이 없습니다.');
      return;
    }

    // 우클릭이면 1개만, 좌클릭이면 들고 있는 묶음 전체
    const amountToAdd =
      pointer.button === 2
        ? 1
        : sourceStack.count;

    // 떡방앗간 왼쪽 슬롯에 밀 추가
    this.millInputType = 'wheat';
    this.millInputCount += amountToAdd;

    // 플레이어 인벤토리에서 투입한 수량 감소
    sourceStack.count -= amountToAdd;

    // 원래 묶음을 전부 넣은 경우
    if (sourceStack.count <= 0) {
      this.inventoryData[sourceIndex] = null;
      this.clearHeldInventoryItem();
    } else {
      // 우클릭으로 1개만 넣었으면 나머지는 계속 마우스에 들고 있음
      this.heldInventoryItem.count = sourceStack.count;
      this.updateHeldItemPreview();
    }

    this.updateInventoryHUD();
    this.updateMillMachineSlots();

    // 기계가 쉬고 있다면 제작 시작
    this.startNextMillCraft();

    this.showMillNotice(
      `밀 ${amountToAdd}개를 투입했습니다.`,
    );
  }

  startNextMillCraft() {
    // 이미 제작 중이면 새 제작을 시작하지 않음
    if (this.millCrafting) {
      return;
    }

    // 투입된 밀이 없으면 시작하지 않음
    if (this.millInputCount <= 0) {
      return;
    }

    this.millCrafting = true;

    this.millCraftStartAt = this.time.now;

    this.millCraftEndAt =
      this.time.now + this.millCraftDuration;

    this.updateMillMachineSlots();
  }

  handleMillOutputClick() {
    if (this.heldInventoryItem) {
      this.showMillNotice(
        '현재 들고 있는 아이템을 먼저 내려놓으세요.',
      );
      return;
    }

    if (this.millOutputCount <= 0) {
      if (this.millCrafting) {
        this.showMillNotice('아직 떡을 만드는 중입니다.');
      } else {
        this.showMillNotice('완성된 떡이 없습니다.');
      }

      return;
    }

    const collectedCount = this.millOutputCount;

    this.basicRiceCakeCount += collectedCount;
    this.millOutputCount = 0;

    this.updateInventoryHUD();
    this.updateMillMachineSlots();

    this.showMillNotice(
      `기본 떡 ${collectedCount}개를 인벤토리에 넣었습니다.`,
    );
  }

  updateRiceCakeMill() {
    // 제작 중이 아니지만 밀은 남아 있다면 다음 제작 시작
    if (!this.millCrafting) {
      if (this.millInputCount > 0) {
        this.startNextMillCraft();
      }

      return;
    }

    const remaining =
      this.millCraftEndAt - this.time.now;

    // 아직 제작 중
    if (remaining > 0) {
      this.updateMillMachineSlots();
      return;
    }

    // 떡 1개 제작 완료
    this.millCrafting = false;

    // 왼쪽 밀 1개 소비
    this.millInputCount -= 1;

    // 오른쪽 결과 슬롯에 떡 1개 추가
    this.millOutputCount += 1;

    if (this.millInputCount <= 0) {
      this.millInputCount = 0;
      this.millInputType = null;
    }

    this.updateMillMachineSlots();

    if (this.millOpen) {
      this.showMillNotice(
        '기본 떡 1개가 완성되었습니다!',
      );
    }

    // 투입된 밀이 더 남아 있으면 다음 떡을 자동 제작
    if (this.millInputCount > 0) {
      this.startNextMillCraft();
    }
  }

  updateMillMachineSlots() {
    if (!this.millInputIcon) {
      return;
    }

    // 투입 슬롯
    this.millInputIcon.clear();
    this.millInputCountText.setText('');

    if (
      this.millInputType === 'wheat' &&
      this.millInputCount > 0
    ) {
      this.drawInventoryIcon(
        this.millInputIcon,
        'wheat',
      );

      this.millInputCountText.setText(
        `x${this.millInputCount}`,
      );
    }

    // 결과 슬롯
    this.millOutputIcon.clear();
    this.millOutputCountText.setText('');

    if (this.millOutputCount > 0) {
      this.drawInventoryIcon(
        this.millOutputIcon,
        'ricecake',
      );

      this.millOutputCountText.setText(
        `x${this.millOutputCount}`,
      );
    }

    // 제작 진행도
    if (this.millCrafting) {
      const elapsed =
        this.time.now - this.millCraftStartAt;

      const progress = Phaser.Math.Clamp(
        elapsed / this.millCraftDuration,
        0,
        1,
      );

      const remainingSeconds = Math.max(
        1,
        Math.ceil(
          (this.millCraftEndAt - this.time.now) / 1000,
        ),
      );

      this.millProgressFill.setScale(progress, 1);

      this.millProgressText.setText(
        `기본 떡 제작 중 · ${remainingSeconds}초 남음 · 투입 밀 ${this.millInputCount}개`,
      );

      return;
    }

    this.millProgressFill.setScale(0, 1);

    if (this.millOutputCount > 0) {
      this.millProgressText.setText(
        '완성된 떡을 클릭해서 가져가세요.',
      );
    } else {
      this.millProgressText.setText(
        '밀을 넣으면 제작이 시작됩니다.',
      );
    }
  }

  showMillNotice(message, duration = 1400) {
    if (!this.millNoticeText) {
      return;
    }

    this.millNoticeText.setText(message);

    this.time.delayedCall(duration, () => {
      if (this.millNoticeText) {
        this.millNoticeText.setText('');
      }
    });
  }


  updateInventoryPanel() {
    this.renderInventorySlots(this.inventorySlots);
    this.renderInventorySlots(this.millInventorySlots);
  }

  renderInventorySlots(slotList) {
    if (!slotList || slotList.length === 0) {
      return;
    }

    for (let i = 0; i < slotList.length; i += 1) {
      const slot = slotList[i];
      const stack = this.inventoryData[i];
      const item = this.getInventoryItemData(stack);

      slot.item = item;

      slot.icon.clear();
      slot.countText.setText('');
      if (slot.itemImage) {
      slot.itemImage.setVisible(false);
      }
      slot.outer.setStrokeStyle(3, 0xe5e7eb);
      slot.container.setScale(1);

      const isHeldSource =
        this.heldInventoryItem &&
        this.heldItemSourceSlot &&
        this.heldItemSourceSlot.index === i;

      slot.icon.setAlpha(isHeldSource ? 0.2 : 1);
      slot.countText.setAlpha(isHeldSource ? 0.2 : 1);

      if (!item) {
        continue;
      }

      if (item.imageKey && slot.itemImage) {
        slot.itemImage
          .setTexture(item.imageKey)
          .setVisible(true);
      } else {
        this.drawInventoryIcon(slot.icon, item.type);
      }

      slot.countText.setText(`x${item.count}`);
    }
  }

  

  
  drawInventoryIcon(graphics, type) {
    graphics.clear();

    if (type === 'seed') {
      // 씨앗
      graphics.fillStyle(0x2f9e44);
      graphics.fillEllipse(-8, -2, 10, 14);

      graphics.fillStyle(0xe9c46a);
      graphics.fillEllipse(4, 6, 10, 14);

      graphics.lineStyle(2, 0x2b8a3e);
      graphics.beginPath();
      graphics.moveTo(-2, 8);
      graphics.lineTo(-10, 18);
      graphics.strokePath();
      return;
    }

    if (type === 'wheat') {
      // 밀
      graphics.lineStyle(3, 0x8d6e63);
      graphics.beginPath();
      graphics.moveTo(0, 18);
      graphics.lineTo(0, -16);
      graphics.strokePath();

      graphics.fillStyle(0xf4d35e);

      graphics.fillEllipse(-8, -10, 10, 8);
      graphics.fillEllipse(8, -6, 10, 8);
      graphics.fillEllipse(-8, -1, 10, 8);
      graphics.fillEllipse(8, 3, 10, 8);
      graphics.fillEllipse(-8, 8, 10, 8);
      graphics.fillEllipse(8, 12, 10, 8);
      return;
    }

    if (type === 'ricecake') {
      // 기본 떡
      graphics.fillStyle(0xd9b382);
      graphics.fillRoundedRect(-18, 4, 36, 10, 4);

      graphics.fillStyle(0xffffff);
      graphics.fillCircle(0, -2, 18);

      graphics.lineStyle(2, 0xd1d5db);
      graphics.strokeCircle(0, -2, 18);
    }
  }

  createHeldItemPreview() {
    // 아이템 아래에 표시되는 그림자
    const shadow = this.add.ellipse(
      0,
      22,
      58,
      18,
      0x000000,
      0.25,
    );

    this.heldItemIcon = this.add.graphics();
    this.heldItemImage = this.add
      .image(0, 0, 'tteok_basic')
      .setDisplaySize(66, 66)
      .setVisible(false);

    this.heldItemCountText = this.add
      .text(28, 28, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 4,
      })
      .setOrigin(1, 1);

    this.heldItemContainer = this.add.container(0, 0, [
      shadow,
      this.heldItemIcon,
       this.heldItemImage,
      this.heldItemCountText,
    ]);

    this.heldItemContainer
      .setDepth(300)
      .setScrollFactor(0)
      .setVisible(false);
  }

  pickUpInventoryItem(slot, pointer) {
    // 일반 인벤토리나 떡방앗간이 열려 있을 때만 작동
    if (!this.inventoryOpen && !this.millOpen) {
      return;
    }

    if (this.heldInventoryItem) {
      return;
    }

    const stack = this.inventoryData[slot.index];
    const item = this.getInventoryItemData(stack);

    if (!item) {
      return;
    }


    // 실제 슬롯 데이터는 그대로 두고 마우스로 든 상태만 기록
    this.heldInventoryItem = {
      ...item,
    };

    this.heldItemSourceSlot = {
      index: slot.index,
    };

    this.heldItemIcon.clear();
    this.heldItemImage.setVisible(false);

    if (item.imageKey) {
      this.heldItemImage
        .setTexture(item.imageKey)
        .setVisible(true);
    } else {
      this.drawInventoryIcon(
        this.heldItemIcon,
        item.type,
      );
    }

    this.heldItemCountText.setText(`x${item.count}`);

    this.heldItemContainer
      .setPosition(pointer.x, pointer.y - 18)
      .setScale(0.85)
      .setAlpha(1)
      .setVisible(true);

    this.tweens.add({
      targets: this.heldItemContainer,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 100,
      ease: 'Back.Out',
    });

    this.updateInventoryPanel();
  }

  placeWholeHeldItem(targetIndex) {
    if (
      !this.heldInventoryItem ||
      !this.heldItemSourceSlot
    ) {
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;

    // 원래 칸을 클릭하면 그냥 내려놓기
    if (sourceIndex === targetIndex) {
      this.releaseHeldInventoryItem();
      return;
    }

    const sourceStack = this.inventoryData[sourceIndex];
    const targetStack = this.inventoryData[targetIndex];

    if (!sourceStack) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 빈칸으로 전체 이동
    if (!targetStack) {
      this.inventoryData[targetIndex] = sourceStack;
      this.inventoryData[sourceIndex] = null;

      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 같은 아이템이면 합치기
    if (targetStack.type === sourceStack.type) {
      targetStack.count += sourceStack.count;
      this.inventoryData[sourceIndex] = null;

      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 다른 아이템이면 서로 교환
    this.inventoryData[targetIndex] = sourceStack;
    this.inventoryData[sourceIndex] = targetStack;

    this.clearHeldInventoryItem();
    this.updateInventoryPanel();
  }

  placeOneHeldItem(targetIndex) {
    if (
      !this.heldInventoryItem ||
      !this.heldItemSourceSlot
    ) {
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;

    // 원래 슬롯에는 우클릭으로 놓지 않음
    if (sourceIndex === targetIndex) {
      return;
    }

    const sourceStack = this.inventoryData[sourceIndex];
    const targetStack = this.inventoryData[targetIndex];

    if (!sourceStack || sourceStack.count <= 0) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 다른 아이템이 들어 있는 칸에는 한 개를 놓을 수 없음
    if (
      targetStack &&
      targetStack.type !== sourceStack.type
    ) {
      if (this.millOpen) {
        this.showMillNotice(
          '다른 종류의 아이템이 있는 칸입니다.',
        );
      } else {
        this.showInventoryNotice(
          '다른 종류의 아이템이 있는 칸입니다.',
        );
      }

      return;
    }

    // 빈칸이면 새로운 1개짜리 묶음 생성
    if (!targetStack) {
      this.inventoryData[targetIndex] = {
        type: sourceStack.type,
        count: 1,
      };
    } else {
      // 같은 아이템이면 1개 증가
      targetStack.count += 1;
    }

    // 원래 묶음에서 1개 감소
    sourceStack.count -= 1;

    if (sourceStack.count <= 0) {
      this.inventoryData[sourceIndex] = null;
      this.clearHeldInventoryItem();
    } else {
      this.heldInventoryItem.count =
        sourceStack.count;

      this.updateHeldItemPreview();
    }

    this.updateInventoryPanel();
  }

  updateHeldItemPreview() {
    if (!this.heldInventoryItem) {
      return;
    }

    this.heldItemCountText.setText(
      `x${this.heldInventoryItem.count}`,
    );
  }

  handleInventorySlotClick(slot, pointer) {
    if (this.discardConfirmOpen) {
      return;
    }

    // 아이템을 들고 있지 않은 상태
    if (!this.heldInventoryItem) {
      // 좌클릭으로만 아이템 집기
      if (pointer.button === 0) {
        this.pickUpInventoryItem(slot, pointer);
      }

      return;
    }

    // 우클릭: 한 개씩 놓기
    if (pointer.button === 2) {
      this.placeOneHeldItem(slot.index);
      return;
    }

    // 좌클릭: 전체 묶음 놓기 또는 교환
    if (pointer.button === 0) {
      this.placeWholeHeldItem(slot.index);
    }
  }

  moveHeldInventoryItem(pointer) {
    if (!this.heldInventoryItem) {
      return;
    }

    this.heldItemContainer.setPosition(
      pointer.x,
      pointer.y - 18,
    );
  }

  releaseHeldInventoryItem() {
    if (!this.heldInventoryItem) {
      return;
    }

    // 실제 아이템 데이터는 건드리지 않고
    // 마우스에 들고 있는 상태만 해제
    this.clearHeldInventoryItem();

    // 인벤토리 화면 다시 그리기
    this.updateInventoryPanel();
  }

  clearHeldInventoryItem() {
    // 마우스를 따라다니는 아이템 숨기기
    this.heldItemContainer
      .setVisible(false)
      .setAlpha(1)
      .setScale(1);

    // 아이콘과 수량 글자 지우기
    this.heldItemIcon.clear();
    this.heldItemCountText.setText('');

    // 들고 있는 아이템 정보 초기화
    this.heldInventoryItem = null;
    this.heldItemSourceSlot = null;

    this.heldItemImage.setVisible(false);
  }

  getInventoryItemData(stack) {
    if (!stack || stack.count <= 0) {
      return null;
    }

    const definitions = {
      seed: {
        name: '씨앗',
        description: '농장에 심으면 밀이 자랍니다.',
        imageKey: null,
      },

      wheat: {
        name: '밀',
        description: '기본 떡을 만드는 재료입니다.',
        imageKey: null,
      },

      ricecake: {
        name: '기본 떡',
        description: '가격이 변하지 않는 기본 떡입니다.',
        imageKey: 'tteok_basic',
      },

      yellow_tteok: {
        name: '노랑 달 떡',
        description: '금가루를 사용해 만든 떡입니다.',
        imageKey: 'tteok_yellow',
      },

      brown_tteok: {
        name: '갈색 달 떡',
        description: '목재를 사용해 만든 떡입니다.',
        imageKey: 'tteok_brown',
      },

      blue_tteok: {
        name: '파랑 달 떡',
        description: '물고기를 사용해 만든 떡입니다.',
        imageKey: 'tteok_blue',
      },

      red_tteok: {
        name: '빨강 달 떡',
        description: '고기를 사용해 만든 떡입니다.',
        imageKey: 'tteok_red',
      },

      green_tteok: {
        name: '초록 달 떡',
        description: '슬라임을 사용해 만든 떡입니다.',
        imageKey: 'tteok_green',
      },

      shining_tteok: {
        name: '빛나는 떡',
        description: '전설 재료로 만든 매우 귀한 떡입니다.',
        imageKey: 'tteok_shining',
      },
    };

    const definition = definitions[stack.type];

    if (!definition) {
      return null;
    }

    return {
      type: stack.type,
      count: stack.count,
      name: definition.name,
      description: definition.description,
      imageKey: definition.imageKey,
    };
  }

  discardHeldInventoryItem() {
    if (
      !this.heldInventoryItem ||
      !this.heldItemSourceSlot
    ) {
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;
    const discardedStack = this.inventoryData[sourceIndex];

    if (!discardedStack) {
      this.clearHeldInventoryItem();
      return;
    }

    const discardedItem =
      this.getInventoryItemData(discardedStack);

    // 집었던 슬롯의 묶음만 삭제
    this.inventoryData[sourceIndex] = null;

    this.clearHeldInventoryItem();
    this.updateInventoryHUD();

    this.showInventoryNotice(
      `${discardedItem.name} ${discardedItem.count}개를 버렸습니다.`,
    );
  }

  createDiscardConfirmation() {
    // 화면 전체를 어둡게 만드는 배경
    this.discardConfirmOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.72)
      .setDepth(400)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    // 확인창 바깥을 클릭하면 삭제 취소
    this.discardConfirmOverlay.on('pointerdown', () => {
      this.cancelDiscardConfirmation();
    });

    const panelBackground = this.add
      .rectangle(0, 0, 500, 270, 0x1f2937)
      .setStrokeStyle(5, 0xfca5a5)
      .setInteractive();

    // 확인창 안쪽 클릭이 바깥 배경으로 전달되지 않게 막음
    panelBackground.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      },
    );

    const title = this.add
      .text(0, -90, '아이템 삭제', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#fecaca',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.discardConfirmText = this.add
      .text(0, -25, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5);

    // 취소 버튼
    const cancelButton = this.add
      .rectangle(-110, 82, 170, 58, 0x4b5563)
      .setStrokeStyle(3, 0xd1d5db)
      .setInteractive({
        useHandCursor: true,
      });

    const cancelText = this.add
      .text(-110, 82, '취소', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    cancelButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.cancelDiscardConfirmation();
      },
    );

    // 삭제 버튼
    const confirmButton = this.add
      .rectangle(110, 82, 170, 58, 0x991b1b)
      .setStrokeStyle(3, 0xfca5a5)
      .setInteractive({
        useHandCursor: true,
      });

    const confirmText = this.add
      .text(110, 82, '정말 버리기', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    confirmButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.confirmDiscardHeldItem();
      },
    );

    this.discardConfirmPanel = this.add.container(
      640,
      360,
      [
        panelBackground,
        title,
        this.discardConfirmText,
        cancelButton,
        cancelText,
        confirmButton,
        confirmText,
      ],
    );

    this.discardConfirmPanel
      .setDepth(410)
      .setScrollFactor(0)
      .setVisible(false);
  }

  openDiscardConfirmation() {
    if (!this.heldInventoryItem) {
      return;
    }

    this.discardConfirmOpen = true;

    this.discardConfirmText.setText(
      `${this.heldInventoryItem.name} ${this.heldInventoryItem.count}개를\n정말 삭제하시겠습니까?\n\n삭제한 아이템은 되돌릴 수 없습니다.`,
    );

    // 마우스에 붙은 아이템은 확인창이 뜨는 동안 숨김
    this.heldItemContainer.setVisible(false);

    this.discardConfirmOverlay.setVisible(true);
    this.discardConfirmPanel.setVisible(true);
  }

  closeDiscardConfirmation() {
    this.discardConfirmOpen = false;

    this.discardConfirmOverlay.setVisible(false);
    this.discardConfirmPanel.setVisible(false);
  }

  cancelDiscardConfirmation() {
    if (!this.discardConfirmOpen) {
      return;
    }

    this.closeDiscardConfirmation();

    // 취소하면 아이템을 원래 슬롯으로 돌려보냄
    this.releaseHeldInventoryItem();
  }

  confirmDiscardHeldItem() {
    if (
      !this.discardConfirmOpen ||
      !this.heldInventoryItem
    ) {
      return;
    }

    this.closeDiscardConfirmation();

    // 기존에 있던 실제 삭제 함수 실행
    this.discardHeldInventoryItem();
  }

  toggleInventory() {
      // 삭제 확인창이 열려 있으면 E로 확인창만 취소
    if (this.discardConfirmOpen) {
      this.cancelDiscardConfirmation();
      return;
    }

    // 인벤토리를 닫을 때 들고 있던 아이템은 원래 자리로 복귀
    if (this.inventoryOpen && this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }

    this.inventoryOpen = !this.inventoryOpen;

    this.inventoryOverlay.setVisible(this.inventoryOpen);
    this.inventoryPanel.setVisible(this.inventoryOpen);

    if (this.inventoryOpen) {
      this.player.body.setVelocity(0);
      this.interactionText.setVisible(false);
      this.updateInventoryPanel();
    }
  }

  updateInventoryHUD() {
    this.inventoryText.setText(
      `씨앗: ${this.seedCount}개  |  밀: ${this.wheatCount}개`,
    );

    this.updateInventoryPanel();
  }

  update() {
    // 인벤토리나 떡방앗간이 열려 있어도
    // 농작물과 떡 제작 시간은 계속 흐름
    this.updateFarmGrowth();
    this.updateRiceCakeMill();

    // -------------------------------------------------
    // ESC 키로 현재 열려 있는 창 닫기
    // -------------------------------------------------
    if (
      Phaser.Input.Keyboard.JustDown(
        this.keys.close,
      )
    ) {
      if (this.shopConfirmOpen) {
        this.cancelShopTransaction();
        return;
      }
      // 아이템 삭제 확인창이 열려 있으면 확인창만 닫기
      if (this.discardConfirmOpen) {
        this.cancelDiscardConfirmation();
        return;
      }
      
      if (this.shopOpen) {
        this.closeShop();
        return;
      }
      // 떡방앗간이 열려 있으면 떡방앗간 닫기
      if (this.millOpen) {
        this.closeRiceCakeMill();
        return;
      }

      // 일반 인벤토리가 열려 있으면 인벤토리 닫기
      if (this.inventoryOpen) {
        this.toggleInventory();
        return;
      }
    }

    // -------------------------------------------------
    // E 키 처리
    // -------------------------------------------------
    if (
      Phaser.Input.Keyboard.JustDown(
        this.keys.inventory,
      )
    ) {
      if (this.shopConfirmOpen) {
        this.cancelShopTransaction();
        return;
      }

      // 삭제 확인창이 열려 있으면 확인창 닫기
      if (this.discardConfirmOpen) {
        this.cancelDiscardConfirmation();
        return;
      }

      if (this.shopOpen) {
        this.closeShop();
        return;
      }

      // 떡방앗간이 열려 있으면 떡방앗간 닫기
      if (this.millOpen) {
        this.closeRiceCakeMill();
        return;
      }

      // 일반 인벤토리 열기 또는 닫기
      this.toggleInventory();
    }

    // -------------------------------------------------
    // 창이 열려 있으면 이동과 상호작용 중지
    // -------------------------------------------------
    if (
      this.inventoryOpen ||
      this.millOpen ||
      this.shopOpen ||
      this.discardConfirmOpen ||
      this.shopConfirmOpen
    ) {
      this.player.body.setVelocity(0);
      this.interactionText.setVisible(false);
      return;
    }

    // 아무 창도 열려 있지 않을 때만 움직임
    this.movePlayer();
    this.updatePlayerParts();
    this.checkNearbyArea();
  }

  movePlayer() {
    const body = this.player.body;

    body.setVelocity(0);

    const moveLeft =
      this.keys.left.isDown || this.cursors.left.isDown;

    const moveRight =
      this.keys.right.isDown || this.cursors.right.isDown;

    const moveUp =
      this.keys.up.isDown || this.cursors.up.isDown;

    const moveDown =
      this.keys.down.isDown || this.cursors.down.isDown;

    if (moveLeft) {
      body.setVelocityX(-this.playerSpeed);
    } else if (moveRight) {
      body.setVelocityX(this.playerSpeed);
    }

    if (moveUp) {
      body.setVelocityY(-this.playerSpeed);
    } else if (moveDown) {
      body.setVelocityY(this.playerSpeed);
    }

    body.velocity.normalize().scale(this.playerSpeed);
  }

  updatePlayerParts() {
    this.playerEars[0].setPosition(
      this.player.x - 12,
      this.player.y - 37,
    );

    this.playerEars[1].setPosition(
      this.player.x + 12,
      this.player.y - 37,
    );

    this.playerLabel.setPosition(
      this.player.x,
      this.player.y + 34,
    );
  }

  updateFarmGrowth() {
    const currentTime = this.time.now;

    this.farmPlots.forEach((plot) => {
      if (plot.state !== 'growing') {
        return;
      }

      const remainingMilliseconds = plot.readyAt - currentTime;

      // 성장이 완료된 경우
      if (remainingMilliseconds <= 0) {
        plot.state = 'ready';

        plot.rectangle.setFillStyle(0xc99f3f);

        plot.statusText
          .setText('수확!')
          .setColor('#ffffff');

        return;
      }

      // 남은 시간 표시
      const remainingSeconds = Math.ceil(
        remainingMilliseconds / 1000,
      );

      plot.statusText
        .setText(`${remainingSeconds}초`)
        .setColor('#d8f5af');
    });
  }

  findNearestFarmPlot() {
    let nearestPlot = null;
    let nearestDistance = Infinity;

    this.farmPlots.forEach((plot) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        plot.rectangle.x,
        plot.rectangle.y,
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlot = plot;
      }
    });

    // 밭에서 너무 멀면 선택하지 않음
    if (nearestDistance > 75) {
      return null;
    }

    return nearestPlot;
  }

  updateFarmPlotHighlight(selectedPlot) {
    this.farmPlots.forEach((plot) => {
      if (plot === selectedPlot) {
        plot.rectangle.setStrokeStyle(4, 0xffffff);
      } else {
        plot.rectangle.setStrokeStyle(2, 0xe2c28b);
      }
    });
  }

  getFarmPrompt(plot) {
    if (!plot) {
      return '심을 밭 가까이 이동하세요';
    }

    if (plot.state === 'empty') {
      if (this.seedCount <= 0) {
        return '씨앗이 없습니다';
      }

      return '[SPACE] 이 밭에 씨앗 심기';
    }

    if (plot.state === 'growing') {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((plot.readyAt - this.time.now) / 1000),
      );

      return `밀이 자라는 중입니다 · ${remainingSeconds}초 남음`;
    }

    if (plot.state === 'ready') {
      return '[SPACE] 이 밭의 밀 수확하기';
    }

    return '';
  }

  handleFarmInteraction(plot) {
    if (!plot) {
      return;
    }

    // 빈 밭에 씨앗 심기
    if (plot.state === 'empty') {
      if (this.seedCount <= 0) {
        return;
      }

      this.seedCount -= 1;

      plot.state = 'growing';

      // 이 밭이 다 자라는 시간을 개별적으로 기록
      plot.readyAt = this.time.now + this.wheatGrowthTime;

      plot.rectangle.setFillStyle(0x6e5232);

      plot.statusText
        .setText('10초')
        .setColor('#d8f5af');

      this.updateInventoryHUD();
      return;
    }

    // 다 자란 밀 수확
    if (plot.state === 'ready') {
      this.wheatCount += 1;

      plot.state = 'empty';
      plot.readyAt = 0;

      plot.rectangle.setFillStyle(0x62452f);

      plot.statusText
        .setText('빈 밭')
        .setColor('#ffffff');

      this.updateInventoryHUD();
    }
  }
  getRiceCakeMillPrompt() {
    if (this.wheatCount <= 0) {
      return '기본 떡을 만들려면 밀이 필요합니다';
    }

    return '[SPACE] 기본 떡 만들기 · 밀 1개 필요';
  }
  
  showInteractionMessage(message, duration = 1000) {
    this.interactionMessageActive = true;

    this.interactionText
      .setText(message)
      .setVisible(true);

    this.time.delayedCall(duration, () => {
      this.interactionMessageActive = false;
    });
  }
  checkNearbyArea() {
    let nearbyArea = null;

    for (const area of this.areas) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        area.object.x,
        area.object.y,
      );

      if (distance < 190) {
        nearbyArea = area;
        break;
      }
    }

    this.currentArea = nearbyArea;

    // 아무 장소 근처에도 없는 경우
    if (!nearbyArea) {
      this.nearestFarmPlot = null;
      this.updateFarmPlotHighlight(null);

      this.interactionMessageActive = false;
      this.interactionText.setVisible(false);

      return;
    }

    // 성공 및 실패 메시지가 표시되는 동안
    // 원래 안내 문구로 덮어쓰지 않음
    if (this.interactionMessageActive) {
      return;
    }

    // 농장 상호작용
    if (nearbyArea.name === '농장') {
      this.nearestFarmPlot = this.findNearestFarmPlot();

      this.updateFarmPlotHighlight(this.nearestFarmPlot);

      this.interactionText
        .setText(this.getFarmPrompt(this.nearestFarmPlot))
        .setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
        this.handleFarmInteraction(this.nearestFarmPlot);
      }

      return;
    }

    // 농장이 아니면 밭 선택 효과 제거
    this.nearestFarmPlot = null;
    this.updateFarmPlotHighlight(null);

    // 떡방앗간 상호작용
    if (nearbyArea.name === '떡방앗간') {
      this.interactionText
        .setText('[SPACE] 떡방앗간 열기')
        .setVisible(true);

      if (
        Phaser.Input.Keyboard.JustDown(
          this.keys.interact,
        )
      ) {
        this.openRiceCakeMill();
      }

      return;
    }

    if (nearbyArea.name === '상점') {
      this.interactionText
        .setText('[SPACE] 상점 열기')
        .setVisible(true);

      if (
        Phaser.Input.Keyboard.JustDown(
          this.keys.interact,
        )
      ) {
        this.openShop();
      }

      return;
    }

    // 집과 상점 등 아직 개발하지 않은 장소
    this.interactionText
      .setText(`[SPACE] ${nearbyArea.name} 이용하기`)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.showAreaMessage(nearbyArea);
    }
  }

  showAreaMessage(area) {
    this.interactionText.setText(
      `${area.name}: ${area.description}\n현재는 개발 중입니다.`,
    );

    this.time.delayedCall(1500, () => {
      if (!this.currentArea) {
        return;
      }

      this.interactionText.setText(
        `[SPACE] ${this.currentArea.name} 이용하기`,
      );
    });
  }
}