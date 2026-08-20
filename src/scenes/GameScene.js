import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.player = null;
    this.playerLabel = null;

    this.keys = null;
    this.cursors = null;
    this.playerSpeed = 230;

    this.areas = [];
    this.currentArea = null;
    this.interactionText = null;
    this.inventoryOpen = false;
    this.inventoryOverlay = null;

    this.walkFrameToggle = false;
    this.walkAnimTimer = 0;
    this.walkAnimInterval = 180; // 프레임 전환 간격(ms), 숫자 줄이면 더 빠르게 걷는 느낌
    this.isMoving = false;

    // 집 내부 (포탈 방식 실내 진입)
    this.inHouse = false;
    this.outdoorContainer = null;
    this.houseInteriorContainer = null;
    this.houseAreas = [];
    this.currentHouseArea = null;
    this.houseExitSpawn = { x: 950, y: 220 };
    this.houseEnterSpawn = { x: 640, y: 530 };

    this.inFarm = false;
    this.farmInteriorContainer = null;
    this.farmExitSpawn = { x: 400, y: 220 };
    this.farmEnterSpawn = { x: 640, y: 530 };
    this.farmDoorX = 640;
    this.farmDoorY = 550;

    // 가구 들어서 옮기기 (스페이스 꾹 누르기)
    this.carriedFurniture = null;

    // 집 안에서 새로 누른 SPACE만 시간 측정
    this.spaceKeyDownAt = null;
    this.spaceHoldFired = false;
    this.spaceHoldDuration = 450;

    // SPACE 키의 눌림/떼임을 프레임마다 직접 계산해서 사용 (실내/실외 상호작용이 모두 이 값을 공유)
    this.previousInteractIsDown = false;
    this.interactJustPressed = false;
    this.interactJustReleased = false;

    // -------------------------------------------------------------------------
    // 날짜와 시계
    // -------------------------------------------------------------------------

    this.dayNumber = 1;
    this.dayText = null;

    // 게임 속 하루: 08:00 ~ 23:00 (15시간)
    this.dayStartHour = 8;
    this.dayEndHour = 23;
    this.dayLengthMinutes = (this.dayEndHour - this.dayStartHour) * 60;

    // 현실 1초 = 게임 속 1분 → 하루(15시간=900분)가 현실 15분
    this.dayDurationMs = this.dayLengthMinutes * 1000;

    // 오늘이 시작된 후 흐른 시간
    this.dayElapsedMs = 0;

    // 탭이 백그라운드에 있어도(프레임이 안 돌아도) 시간이 밀리지 않도록
    // 델타 누적이 아니라 실제 시각(Date.now())을 기준으로 경과시간을 계산
    this.dayStartTimestamp = Date.now();

    // 첫날 집세
    this.currentRent = 500;
    this.rentText = null;

    // 난이도 (선택 기능 생기기 전까지는 쉬움으로 고정)
    // 여기 적힌 값 중 쉬움만 확정이고, 나머지는 나중에 조정할 자리만 잡아둔 값
    this.difficulty = 'easy';
    this.difficultySettings = {
      easy: {
        label: '쉬움',
        // 전날 대비 집세 인상률
        rentGrowthRate: 0.3,
        // 밤에 늑대가 찾아올 확률
        wolfVisitChance: 0.35,
        // 늑대가 냉장고 안 떡을 가져가는 비율 (최소 1개)
        wolfStealPercent: 0.2,
        // 생활 활동(벌목/낚시 등) 재료 획득량 배율. 아직 생활 활동 시스템이 없어서 자리만 잡아둠
        materialYieldMultiplier: 1,
      },
      normal: {
        label: '중간',
        rentGrowthRate: 0.5,
        wolfVisitChance: 0.5,
        wolfStealPercent: 0.3,
        materialYieldMultiplier: 0.85,
      },
      hard: {
        label: '어려움',
        rentGrowthRate: 0.7,
        wolfVisitChance: 0.65,
        wolfStealPercent: 0.45,
        materialYieldMultiplier: 0.7,
      },
      challenge: {
        label: '도전',
        rentGrowthRate: 1.0,
        wolfVisitChance: 0.8,
        wolfStealPercent: 0.6,
        materialYieldMultiplier: 0.5,
      },
    };

    // 오늘 하루 동안 판매한 내역 (type -> {count, total})
    this.dailyLog = {
      sales: {},
    };

    // 하루일지(영수증) 창
    this.journalOpen = false;
    this.journalOverlay = null;
    this.journalPanel = null;
    this.journalTitleText = null;
    this.journalBodyText = null;

    // 수면 시스템
    this.isSleeping = false;
    this.sleepFinishing = false;

    // 23시가 되어 자동으로 잠드는 경우 (침대 없이도 발생, 움직여도 취소되지 않음)
    this.sleepForced = false;

    this.sleepStartedAt = 0;
    this.sleepDuration = 5000;

    this.sleepDarkOverlay = null;
    this.sleepUiContainer = null;
    this.sleepProgressFill = null;
    this.sleepStatusText = null;

    // 냉장고
    this.fridgeLevel = 1;
    this.fridgeCapacityByLevel = { 1: 10, 2: 30, 3: 50 };

    // 인벤토리처럼 슬롯 배열로 관리 (10칸, 총 개수는 레벨별 최대 보관량으로 제한)
    this.fridgeData = Array(10).fill(null);
    this.fridgeSlots = [];
    this.fridgeInventorySlots = [];

    this.fridgeOpen = false;
    this.fridgeOverlay = null;
    this.fridgePanel = null;
    this.fridgeCapacityText = null;
    this.fridgeNoticeText = null;

    // 상하는(냉장 보관하지 않은) 떡 종류 목록
    this.riceCakeTypes = [
      'ricecake',
      'yellow_tteok',
      'brown_tteok',
      'blue_tteok',
      'red_tteok',
      'green_tteok',
      'shining_tteok',
    ];

    this.inventoryPanel = null;
    this.inventorySlots = [];

    // 마우스로 집고 있는 아이템
    this.heldInventoryItem = null;
    this.heldItemSourceSlot = null;

    this.heldItemContainer = null;
    this.heldItemIcon = null;
    this.heldItemCountText = null;

    this.SCREEN_W = 1280;
    this.SCREEN_H = 720;
    this.WORLD_COLS = 3;
    this.WORLD_ROWS = 3;

    // 지금 맵이 정중앙(1,1)이 되도록 좌표를 왼쪽/위로 한 칸씩 밀어서 잡음
    this.currentRoom = { col: 1, row: 1 };
    this.roomTransitioning = false;


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

    // 전자시계 (HH:MM 텍스트)
    this.hudClockText = null;

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

    // 방앗간 안에서 보는 탭: 'rice'(떡방앗간) / 'color'(오색방앗간)
    this.millTab = 'rice';
    this.millTabButtons = {};
    this.riceMillRecipeContainer = null;
    this.colorMillRecipeContainer = null;

    // 오색방앗간: 재료 종류 -> 완성되는 색깔 떡
    this.materialToTteok = {
      slime: 'green_tteok',
      gold_powder: 'yellow_tteok',
      wood: 'brown_tteok',
      fish: 'blue_tteok',
      meat: 'red_tteok',
      legendary_material: 'shining_tteok',
    };
    
    
    
    this.colorMillInputBasicIcon = null;
    this.colorMillInputBasicCountText = null;
    this.colorMillInputBasicCount = 0;

    this.colorMillInputMaterialIcon = null;
    this.colorMillInputMaterialCountText = null;
    this.colorMillInputMaterialType = null;
    this.colorMillInputMaterialCount = 0;

    this.colorMillOutputIcon = null;
    this.colorMillOutputCountText = null;
    this.colorMillOutputType = null;
    this.colorMillOutputCount = 0;

    this.colorMillProgressFill = null;
    this.colorMillProgressText = null;
    this.colorMillNoticeText = null;

    this.colorMillCrafting = false;
    this.colorMillCraftStartAt = 0;
    this.colorMillCraftEndAt = 0;
    this.colorMillCraftDuration = 6000;

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

    // 수량 선택창 (구매/판매 전 몇 개를 거래할지 정하는 창)
    this.shopQuantityOpen = false;
    this.shopQuantityOverlay = null;
    this.shopQuantityPanel = null;
    this.shopQuantityItem = null;
    this.shopQuantityAction = null;
    this.shopQuantityValue = 1;
    this.shopQuantityMax = 1;
    this.shopQuantityTyping = false;
    this.shopQuantityTitleText = null;
    this.shopQuantitySubText = null;
    this.shopQuantityValueText = null;

    // 집 레벨 (자물쇠 구매 조건에 사용, 집 시스템 구현 전까지는 1로 고정)
    this.houseLevel = 1;

    // 현재 열려 있는 상점 카테고리. null이면 카테고리 선택 화면
    this.shopCategoryKey = null;

    // 상점 상품 (카테고리별)
    this.shopCategories = {
      tool: {
        name: '도구상점',
        description: '생활 활동에 필요한 기본 도구를 구매하세요',
        items: [
          {
            type: 'axe',
            name: '도끼',
            description: '벌목에 사용하는 기본 도구입니다.',
            imageKey: null,
            basePrice: 200,
            buyable: true,
            sellable: false,
          },
          {
            type: 'fishing_rod',
            name: '낚싯대',
            description: '낚시에 사용하는 기본 도구입니다.',
            imageKey: null,
            basePrice: 200,
            buyable: true,
            sellable: false,
          },
          {
            type: 'pickaxe',
            name: '곡괭이',
            description: '채광에 사용하는 기본 도구입니다.',
            imageKey: null,
            basePrice: 200,
            buyable: true,
            sellable: false,
          },
          {
            type: 'bow',
            name: '활',
            description: '수렵에 사용하는 기본 도구입니다.',
            imageKey: null,
            basePrice: 200,
            buyable: true,
            sellable: false,
          },
          {
            type: 'lantern',
            name: '랜턴',
            description: '던전 탐험에 사용하는 기본 도구입니다.',
            imageKey: null,
            basePrice: 200,
            buyable: true,
            sellable: false,
          },
        ],
      },

      seed: {
        name: '씨앗상점',
        description: '농장에 심을 씨앗과 방앗간 재료를 구매하세요',
        items: [
          {
            type: 'seed',
            name: '씨앗',
            description: '농장에 심으면 밀이 자랍니다.',
            imageKey: 'ingredient_seed',
            basePrice: 20,
            buyable: true,
            sellable: false,
          },
          {
            type: 'slime',
            name: '슬라임',
            description: '오색방앗간에서 초록 달 떡을 만드는 재료입니다.',
            imageKey: 'ingredient_green',
            basePrice: 50,
            buyable: true,
            sellable: false,
          },
          {
            type: 'gold_powder',
            name: '금가루',
            description: '오색방앗간에서 노랑 달 떡을 만드는 재료입니다.',
            imageKey: 'ingredient_yellow',
            basePrice: 80,
            buyable: true,
            sellable: false,
          },
          {
            type: 'wood',
            name: '목재',
            description: '오색방앗간에서 갈색 달 떡을 만드는 재료입니다.',
            imageKey: 'ingredient_brown',
            basePrice: 40,
            buyable: true,
            sellable: false,
          },
          {
            type: 'fish',
            name: '물고기',
            description: '오색방앗간에서 파랑 달 떡을 만드는 재료입니다.',
            imageKey: 'ingredient_blue',
            basePrice: 60,
            buyable: true,
            sellable: false,
          },
          {
            type: 'meat',
            name: '고기',
            description: '오색방앗간에서 빨강 달 떡을 만드는 재료입니다.',
            imageKey: 'ingredient_red',
            basePrice: 70,
            buyable: true,
            sellable: false,
          },
          {
            type: 'legendary_material',
            name: '전설 재료',
            description: '오색방앗간에서 빛나는 떡을 만드는 귀한 재료입니다.',
            imageKey: 'ingredient_shining',
            basePrice: 500,
            buyable: true,
            sellable: false,
          },
        ],
      },

      tteok: {
        name: '떡상점',
        description: '만든 떡을 판매하세요',
        items: [
          {
            type: 'ricecake',
            name: '기본 떡',
            imageKey: 'tteok_basic',
            basePrice: 300,
            changePercent: 0,
            buyable: false,
            sellable: true,
          },
          {
            type: 'yellow_tteok',
            name: '노랑 달 떡',
            imageKey: 'tteok_yellow',
            basePrice: 600,
            changePercent: 12,
            buyable: false,
            sellable: true,
          },
          {
            type: 'brown_tteok',
            name: '갈색 달 떡',
            imageKey: 'tteok_brown',
            basePrice: 450,
            changePercent: -8,
            buyable: false,
            sellable: true,
          },
          {
            type: 'blue_tteok',
            name: '파랑 달 떡',
            imageKey: 'tteok_blue',
            basePrice: 520,
            changePercent: 5,
            buyable: false,
            sellable: true,
          },
          {
            type: 'red_tteok',
            name: '빨강 달 떡',
            imageKey: 'tteok_red',
            basePrice: 560,
            changePercent: -15,
            buyable: false,
            sellable: true,
          },
          {
            type: 'green_tteok',
            name: '초록 달 떡',
            imageKey: 'tteok_green',
            basePrice: 500,
            changePercent: 20,
            buyable: false,
            sellable: true,
          },
          {
            type: 'shining_tteok',
            name: '빛나는 떡',
            imageKey: 'tteok_shining',
            basePrice: 4000,
            changePercent: 0,
            buyable: false,
            sellable: true,
          },
        ],
      },

      lock: {
        name: '집 상점',
        description: '자물쇠와 냉장고 등 집에 필요한 물건을 구매하세요',
        items: [
          {
            type: 'rusty_lock',
            name: '녹슨 자물쇠',
            description: '설치한 당일 밤에만 효과가 있습니다.',
            imageKey: null,
            basePrice: 150,
            buyable: true,
            sellable: false,
            requiredHouseLevel: 2,
          },
          {
            type: 'steel_lock',
            name: '강철 자물쇠',
            description: '늑대가 찾아올 때까지 계속 유지됩니다.',
            imageKey: null,
            basePrice: 220,
            buyable: true,
            sellable: false,
            requiredHouseLevel: 3,
          },
          {
            type: 'fridge_upgrade_2',
            name: '냉장고 Lv2',
            description: '냉장고 최대 보관량이 30개로 늘어납니다.',
            imageKey: null,
            basePrice: 800,
            buyable: true,
            sellable: false,
            requiredHouseLevel: 2,
            upgradesFridgeTo: 2,
          },
          {
            type: 'fridge_upgrade_3',
            name: '냉장고 Lv3',
            description: '냉장고 최대 보관량이 50개로 늘어납니다.',
            imageKey: null,
            basePrice: 1600,
            buyable: true,
            sellable: false,
            requiredHouseLevel: 3,
            upgradesFridgeTo: 3,
          },
        ],
      },
    };
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

    // 씨앗 / 밀 / 오색방앗간 재료 이미지
    this.load.image(
      'ingredient_seed',
      '/assets/images/items/ingredient/seed.jpg',
    );

    this.load.image(
      'ingredient_wheat',
      '/assets/images/items/ingredient/wheat.jpg',
    );

    this.load.image(
      'ingredient_green',
      '/assets/images/items/ingredient/green.jpg',
    );

    this.load.image(
      'ingredient_yellow',
      '/assets/images/items/ingredient/yellow.jpg',
    );

    this.load.image(
      'ingredient_brown',
      '/assets/images/items/ingredient/brown.jpg',
    );

    this.load.image(
      'ingredient_blue',
      '/assets/images/items/ingredient/blue.jpg',
    );

    this.load.image(
      'ingredient_red',
      '/assets/images/items/ingredient/red.jpg',
    );

    this.load.image(
      'ingredient_shining',
      '/assets/images/items/ingredient/shining.jpg',
    );

    // 플레이어(달토끼) 이미지
    this.load.image(
      'player_idle',
      '/assets/images/player/rabbit.png',
    );

    this.load.image(
      'player_walk',
      '/assets/images/player/rabbit_walk.png',
    );

    this.load.image(
      'player_walk2',
      '/assets/images/player/rabbit_walk3.png',
    );
    
    this.load.image(
      'world_background4',
      '/assets/images/world/background4.jpg', // rabbit.png처럼 미리 만들어둔 background 파일 경로
    );

  }



  create() {
    console.log(
      'tteok_basic 등록 여부:',
      this.textures.exists('tteok_basic'),
    );

    this.outdoorContainer = this.add.container(0, 0);

    this.createWorld();
    this.createAreas();
    this.createFarmInterior();
    this.createHouseInterior();
    this.createPlayer();
    this.createInput();
    this.createHUD();
    this.createItemTooltip();
    this.createSleepUI();
    this.createJournalPanel();
    this.createInventoryPanel();
    this.createRiceCakeMillPanel();
    this.createFridgePanel();
    this.createShopPanel();

    // 확장 월드 기능
    this.worldExpansionEnabled = false;

    if (this.worldExpansionEnabled) {

      // 3x3 확장 월드
      this.physics.world.setBounds(
        -this.SCREEN_W,
        -this.SCREEN_H,
        this.SCREEN_W * this.WORLD_COLS,
        this.SCREEN_H * this.WORLD_ROWS,
      );

      this.cameras.main.setBounds(
        -this.SCREEN_W,
        -this.SCREEN_H,
        this.SCREEN_W * this.WORLD_COLS,
        this.SCREEN_H * this.WORLD_ROWS,
      );

      // 플레이어 추적 카메라
      this.cameras.main.startFollow(
        this.player,
        true,
        0.08,
        0.08,
      );

    } else {

      // 현재 공개 버전: 중앙 마을 1280x720만 사용
      this.physics.world.setBounds(
        0,
        0,
        this.SCREEN_W,
        this.SCREEN_H,
      );

      this.cameras.main.setBounds(
        0,
        0,
        this.SCREEN_W,
        this.SCREEN_H,
      );

      // 카메라 고정
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
    }
  }

  createWorld() {
    this.cameras.main.setBackgroundColor('#0b0f1e');

    const background = this.add
      .image(640, 360, 'world_background4')
      .setDisplaySize(1280, 720);

    this.outdoorContainer.add(background);
  }

  createAreas() {
    this.createArea({
      x: 250,
      y: 175,          // 185 → 175
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
      y: 175,           // 185 → 175
      width: 300,
      height: 210,
      color: 0xb48762,
      name: '달토끼의 집',
      description: '창고와 냉장고를 사용하는 장소',
    });

    this.createArea({
      x: 240,            // 250 → 240
      y: 500,            // 550 → 500
      width: 300,
      height: 210,
      color: 0x5f8aa8,
      name: '상점',
      description: '도구와 씨앗을 구매하는 장소',
    });

    this.createArea({
      x: 1035,           // 1030 → 1035
      y: 500,            // 550 → 500
      width: 300,
      height: 210,
      color: 0xc79f64,
      name: '방앗간',
      description: '밀과 재료로 떡을 만드는 장소',
    });
  }

  createArea({
      x, y, width, height, color, name, description,
      nameY = y - 25, descriptionY = y + 25,
    }) {
      const area = this.add.rectangle(x, y, width, height, color, 0); // 마지막 0 = 투명
      area.setStrokeStyle(0);

      const nameText = this.add.text(x, nameY, name, { /* 기존 스타일 */ }).setOrigin(0.5).setVisible(false);
      const descriptionText = this.add.text(x, descriptionY, description, { /* 기존 스타일 */ }).setOrigin(0.5).setVisible(false);

      this.outdoorContainer.add([area, nameText, descriptionText]);
      this.areas.push({ object: area, name, description });
    }

  createFarmInterior() {
    const children = [];

    const floor = this.add
      .rectangle(640, 320, 820, 460, 0x2f3a22)
      .setStrokeStyle(6, 0xd7bd8a);

    children.push(floor);

    const title = this.add
      .text(640, 130, '농장', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(title);

    const guideText = this.add
      .text(640, 160, '밭 가까이에서 SPACE: 씨앗 심기 · 수확하기', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#d7bd8a',
      })
      .setOrigin(0.5);

    children.push(guideText);

    // 밭 6개 배치 (기존과 같은 상대 배치, 실내 중앙에 맞춤)
    const plotPositions = [
      { x: 490, y: 300 },
      { x: 640, y: 300 },
      { x: 790, y: 300 },
      { x: 490, y: 360 },
      { x: 640, y: 360 },
      { x: 790, y: 360 },
    ];

    plotPositions.forEach((position, index) => {
      const rectangle = this.add
        .rectangle(position.x, position.y, 90, 42, 0x62452f)
        .setStrokeStyle(2, 0xe2c28b);

      const statusText = this.add
        .text(position.x, position.y, '빈 밭', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center',
        })
        .setOrigin(0.5);

      children.push(rectangle, statusText);

      this.farmPlots.push({
        id: index,
        rectangle,
        statusText,
        state: 'empty',
        readyAt: 0,
      });
    });

    // 문
    const door = this.add
      .rectangle(this.farmDoorX, this.farmDoorY, 140, 40, 0x5c4a33)
      .setStrokeStyle(4, 0xe2c28b);
      

    const doorLabel = this.add
      .text(this.farmDoorX, this.farmDoorY, '문', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(door, doorLabel);

    this.farmInteriorContainer = this.add.container(0, 0, children);
    this.farmInteriorContainer.setVisible(false);
  }

  createHouseInterior() {
    const children = [];

    // -------------------------------------------------------------------------
    // 집 바닥
    // -------------------------------------------------------------------------

    const floor = this.add
      .rectangle(640, 320, 820, 460, 0x3a2f22)
      .setStrokeStyle(6, 0xd7bd8a);

    children.push(floor);

    const title = this.add
      .text(640, 130, '달토끼의 집', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(title);

    const guideText = this.add
      .text(
        640,
        160,
        '가구 근처에서 SPACE: 사용 · SPACE 꾹 누르기: 들어서 옮기기',
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#d7bd8a',
        },
      )
      .setOrigin(0.5);

    children.push(guideText);

    this.houseAreas = [];
    this.houseFurnitureByKey = {};

    // -------------------------------------------------------------------------
    // 가구 배치
    //
    // 침대: 왼쪽 벽
    // 창고: 오른쪽 위
    // 냉장고: 오른쪽 아래 임시 배치
    // -------------------------------------------------------------------------

    const furnitureDefinitions = [
      {
        key: 'bed',

        // 왼쪽 벽 쪽에 세로로 배치
        x: 350,
        y: 410,

        width: 150,
        height: 250,

        color: 0x7a5fa8,
        name: '침대',
        description: '잠을 자고 다음 날로 넘어가는 곳',
        visual: 'box',
      },

      {
        key: 'storage',

        // 오른쪽 위 벽 쪽
        x: 830,
        y: 245,

        width: 190,
        height: 110,

        color: 0x8f704f,
        name: '창고',
        description: '도구와 생활 재료를 보관하는 곳',
        visual: 'box',
      },

      {
        key: 'fridge',

        // 구매 시스템 전까지 오른쪽 아래에 임시 배치
        x: 970,
        y: 445,

        name: '냉장고',
        description: '완성된 떡을 다음 날까지 상하지 않게 보관하는 곳',
        visual: 'fridge',
      },
    ];

    furnitureDefinitions.forEach((definition) => {
      const furnitureContainer =
        definition.visual === 'fridge'
          ? this.createFridgeVisual()
          : this.createFurnitureBoxVisual(definition);

      furnitureContainer.setPosition(
        definition.x,
        definition.y,
      );

      children.push(furnitureContainer);

      const areaEntry = {
        object: furnitureContainer,
        container: furnitureContainer,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        furniture: true,
      };

      this.houseAreas.push(areaEntry);
      this.houseFurnitureByKey[definition.key] = areaEntry;
    });

    // -------------------------------------------------------------------------
    // 문
    // -------------------------------------------------------------------------

    const door = this.add
      .rectangle(640, 550, 140, 40, 0x5c4a33)
      .setStrokeStyle(4, 0xe2c28b);

    const doorLabel = this.add
      .text(640, 550, '문', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(door, doorLabel);

    this.houseAreas.push({
      object: door,
      name: '문',
      description: '밖으로 나가는 문',
      furniture: false,
    });

    // -------------------------------------------------------------------------
    // 집 내부 컨테이너
    // -------------------------------------------------------------------------

    this.houseInteriorContainer = this.add.container(
      0,
      0,
      children,
    );

    this.houseInteriorContainer.setVisible(false);
  }

  // 냉장고 모양 컨테이너 생성 (달토끼 정도 크기)
  createFridgeVisual() {
    const width = 66;
    const height = 108;

    const body = this.add
      .rectangle(0, 0, width, height, 0xbfe0f0)
      .setStrokeStyle(3, 0x2b3a4a);

    const divider = this.add.rectangle(
      0,
      -height / 2 + height * 0.4,
      width - 6,
      4,
      0x2b3a4a,
    );

    const topHandle = this.add
      .rectangle(-width / 2 + 9, -height * 0.28, 6, 26, 0x9aa5ad)
      .setOrigin(0.5);

    const bottomHandle = this.add
      .rectangle(-width / 2 + 9, height * 0.16, 6, 34, 0x9aa5ad)
      .setOrigin(0.5);

    const label = this.add
      .text(0, height / 2 + 16, '냉장고', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    return this.add.container(0, 0, [
      body,
      divider,
      topHandle,
      bottomHandle,
      label,
    ]);
  }

  // 창고/침대처럼 아직 모양이 정해지지 않은 가구용 기본 상자 컨테이너
  createFurnitureBoxVisual(definition) {
    const box = this.add
      .rectangle(0, 0, definition.width, definition.height, definition.color)
      .setStrokeStyle(4, 0xffffff, 0.8);

    const label = this.add
      .text(0, 0, definition.name, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    return this.add.container(0, 0, [box, label]);
  }

  createPlayer() {
    this.player = this.add.image(640, 360, 'player_idle');

    // 표시 크기를 정하면 물리 바디도 이 크기에 맞춰 자동으로 계산됨
    this.player.setDisplaySize(400, 248);

    this.physics.add.existing(this.player);
    // 실제 토끼 몸에 가까운 충돌 영역
    this.player.body.setSize(70, 90, true);
    this.player.body.setCollideWorldBounds(true);

    this.playerLabel = this.add
      .text(640, 394, '', {
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
      40,
      1240,
      72,
      0x111827,
      0.94,
    );

    hudBackground.setScrollFactor(0);

    // -------------------------------------------------------------------------
    // 왼쪽: 날짜
    // -------------------------------------------------------------------------

    this.dayText = this.add
      .text(38, 34, '', {
        fontFamily: 'sans-serif',
        fontSize: '23px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // -------------------------------------------------------------------------
    // 왼쪽: 보유금
    // -------------------------------------------------------------------------

    this.moneyText = this.add
      .text(135, 34, '', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffe07a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // -------------------------------------------------------------------------
    // 가운데: 전자시계 (HH:MM)
    // -------------------------------------------------------------------------

    const clockBackground = this.add
      .rectangle(640, 40, 130, 46, 0x0a0f1a, 1)
      .setStrokeStyle(3, 0x2ee6a6)
      .setScrollFactor(0);

    this.hudClockText = this.add
      .text(640, 48, '08:00', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#2ee6a6',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // -------------------------------------------------------------------------
    // 오른쪽: 오늘의 집세
    // -------------------------------------------------------------------------

    this.rentText = this.add
      .text(1242, 34, '', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffb0b0',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0);

    // -------------------------------------------------------------------------
    // 하단 상호작용 안내
    // -------------------------------------------------------------------------

    this.interactionText = this.add
      .text(640, 600, '', {
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
      .setVisible(false)
      .setScrollFactor(0);

    this.createHotbar();

    this.updateMoneyHUD();
    this.updateDayHUD();
    this.updateInventoryHUD();
  }

  // 인벤토리를 열지 않아도 항상 보이는 첫 줄(5칸) 미리보기 (마인크래프트 핫바 느낌)
  createHotbar() {
    const children = [];

    this.hotbarSlots = this.buildFridgeStyleSlotGrid({
      count: 5,
      cols: 5,
      startY: 0,
      slotSize: 52,
      gap: 8,
      dataSource: 'inventory',
      children,
    });

    this.hotbarContainer = this.add.container(640, 686, children);

    this.hotbarContainer
      .setDepth(50)
      .setScrollFactor(0);
  }

  // 인벤토리/방앗간/냉장고 등에서 아이템 위에 마우스를 올리면 이름을 보여주는 툴팁
  createItemTooltip() {
    this.tooltipBackground = this.add
      .rectangle(0, 0, 10, 10, 0x111827, 0.95)
      .setStrokeStyle(2, 0xe8d9a5)
      .setOrigin(0, 0);

    this.tooltipText = this.add
      .text(8, 6, '', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    this.tooltipContainer = this.add.container(0, 0, [
      this.tooltipBackground,
      this.tooltipText,
    ]);

    this.tooltipContainer
      .setDepth(999)
      .setScrollFactor(0)
      .setVisible(false);

    // 마우스가 움직이는 동안 툴팁도 커서를 따라다니게 함
    this.input.on('pointermove', (pointer) => {
      this.moveItemTooltip(pointer);
    });
  }

  showItemTooltip(pointer, name) {
    if (!this.tooltipContainer) {
      return;
    }

    this.tooltipText.setText(name);

    const width = this.tooltipText.width + 16;
    const height = this.tooltipText.height + 12;

    this.tooltipBackground.setSize(width, height);

    this.tooltipContainer.setPosition(
      pointer.x + 18,
      pointer.y + 18,
    );

    this.tooltipContainer.setVisible(true);
  }

  moveItemTooltip(pointer) {
    if (
      !this.tooltipContainer ||
      !this.tooltipContainer.visible
    ) {
      return;
    }

    this.tooltipContainer.setPosition(
      pointer.x + 18,
      pointer.y + 18,
    );
  }

  hideItemTooltip() {
    if (!this.tooltipContainer) {
      return;
    }

    this.tooltipContainer.setVisible(false);
  }

  createSleepUI() {
    // 화면 전체를 덮는 검은색 오버레이
    this.sleepDarkOverlay = this.add
      .rectangle(
        640,
        360,
        1280,
        720,
        0x000000,
        1,
      )
      .setDepth(900)
      .setScrollFactor(0)
      .setAlpha(0)
      .setVisible(false);

    // 수면 안내창 배경
    const panelBackground = this.add
      .rectangle(
        0,
        0,
        460,
        160,
        0x111827,
        0.96,
      )
      .setStrokeStyle(4, 0xd7bd8a);

    const title = this.add
      .text(0, -45, '잠자는 중...', {
        fontFamily: 'sans-serif',
        fontSize: '27px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.sleepStatusText = this.add
      .text(0, -8, '5초 남음', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#d1d5db',
      })
      .setOrigin(0.5);

    // 로딩바 배경
    const progressBackground = this.add
      .rectangle(
        0,
        38,
        330,
        24,
        0x374151,
      )
      .setStrokeStyle(2, 0xe5e7eb);

    // 실제로 차오르는 로딩바
    this.sleepProgressFill = this.add
      .rectangle(
        -163,
        38,
        326,
        18,
        0xf4d35e,
      )
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    const cancelGuide = this.add
      .text(
        0,
        68,
        '이동하면 잠이 취소됩니다.',
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#fca5a5',
        },
      )
      .setOrigin(0.5);

    this.sleepUiContainer = this.add.container(
      640,
      360,
      [
        panelBackground,
        title,
        this.sleepStatusText,
        progressBackground,
        this.sleepProgressFill,
        cancelGuide,
      ],
    );

    this.sleepUiContainer
      .setDepth(901)
      .setScrollFactor(0)
      .setVisible(false);
  }

  createJournalPanel() {
    this.journalOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.8)
      .setDepth(920)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    const background = this.add
      .rectangle(0, 0, 560, 600, 0xfdf6e3, 0.99)
      .setStrokeStyle(4, 0x8a6a3f);

    this.journalTitleText = this.add
      .text(0, -270, '', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#3a2f22',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    this.journalBodyText = this.add
      .text(0, -20, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#3a2f22',
        align: 'left',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0.5);

    const confirmButton = this.add
      .rectangle(0, 260, 220, 56, 0x8a6a3f)
      .setStrokeStyle(3, 0x3a2f22)
      .setInteractive({ useHandCursor: true });

    const confirmText = this.add
      .text(0, 260, '오늘 하루 시작하기', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#fdf6e3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.journalConfirmButton = confirmButton;
    this.journalConfirmButtonText = confirmText;
    this.journalIsGameOver = false;

    confirmButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (this.journalIsGameOver) {
          this.restartGame();
        } else {
          this.closeJournalPanel();
        }
      },
    );

    this.journalPanel = this.add.container(
      640,
      360,
      [
        background,
        this.journalTitleText,
        this.journalBodyText,
        confirmButton,
        confirmText,
      ],
    );

    this.journalPanel
      .setDepth(921)
      .setScrollFactor(0)
      .setVisible(false);
  }

  openJournalPanel(data) {
    this.journalOpen = true;
    this.journalIsGameOver = Boolean(data.isGameOver);

    this.journalTitleText.setText(
      this.journalIsGameOver
        ? `${data.endedDayNumber}일차 - 게임 오버`
        : `${data.endedDayNumber}일차 영수증`,
    );

    const lines = [];

    lines.push('──────────────────────');
    lines.push('[ 판매 내역 ]');

    if (data.sales.length === 0) {
      lines.push('  판매한 떡이 없습니다.');
    } else {
      data.sales.forEach((sale) => {
        lines.push(
          `  ${sale.name} x${sale.count}   ${sale.total.toLocaleString()}원`,
        );
      });
    }

    lines.push('──────────────────────');
    lines.push(
      `총 판매 수익        ${data.totalEarned.toLocaleString()}원`,
    );
    lines.push(
      `총 보유금(집세 전)  ${data.moneyBeforeRent.toLocaleString()}원`,
    );
    lines.push('──────────────────────');
    lines.push(
      `어제 집세 지불      -${data.rentCharged.toLocaleString()}원`,
    );

    if (this.journalIsGameOver) {
      lines.push('  집세를 낼 돈이 부족합니다.');
    } else {
      lines.push(
        `남은 보유금         ${data.moneyAfterRent.toLocaleString()}원`,
      );
      lines.push(
        `오늘 집세           ${data.nextRent.toLocaleString()}원`,
      );
    }

    lines.push('──────────────────────');
    lines.push('[ 야간 상황 ]');

    if (!data.wolfVisited) {
      lines.push('  오늘 밤은 조용했습니다.');
    } else if (data.isLocked) {
      lines.push('  늑대가 다녀갔지만 자물쇠 덕분에 무사했습니다.');
    } else if (data.stolenCount > 0) {
      lines.push(
        `  늑대가 다녀가 냉장고에 있던 떡 ${data.stolenCount}개를 가져갔습니다.`,
      );
    } else {
      lines.push('  늑대가 다녀갔지만 냉장고가 비어 있어 무사했습니다.');
    }

    if (data.spoiledCount > 0) {
      lines.push('──────────────────────');
      lines.push(
        `  냉장고에 없던 떡 ${data.spoiledCount}개가 상했습니다.`,
      );
    }

    lines.push('──────────────────────');

    if (this.journalIsGameOver) {
      lines.push('');
      lines.push('  보유금이 마이너스가 되어');
      lines.push('  달토끼는 집에서 쫓겨났습니다...');
    }

    this.journalBodyText.setText(lines.join('\n'));

    this.journalConfirmButtonText.setText(
      this.journalIsGameOver ? '다시 시작하기' : '오늘 하루 시작하기',
    );

    this.journalConfirmButton.setFillStyle(
      this.journalIsGameOver ? 0x991b1b : 0x8a6a3f,
    );

    this.journalOverlay.setVisible(true);
    this.journalPanel.setVisible(true);
  }

  restartGame() {
    // 아직 저장 기능이 없어서, 완전히 새 게임으로 시작하기 위해 페이지를 새로고침
    window.location.reload();
  }

  closeJournalPanel() {
    if (this.journalIsGameOver) {
      return;
    }

    this.journalOpen = false;

    this.journalOverlay.setVisible(false);
    this.journalPanel.setVisible(false);

    this.interactionMessageActive = false;

    if (
      this.inHouse &&
      this.currentHouseArea &&
      this.currentHouseArea.name === '침대'
    ) {
      this.interactionText
        .setText(
          '[SPACE] 잠자기 · 5초 동안 움직이지 않기\n꾹 누르면 들어서 옮기기',
        )
        .setVisible(true);

      return;
    }

    this.interactionText.setVisible(false);
  }

  updateMoneyHUD() {
    if (this.moneyText) {
      this.moneyText.setText(
        `/ 보유금 : ${this.money.toLocaleString()}원`,
      );
    }

    if (this.shopMoneyText) {
      this.shopMoneyText.setText(
        `보유금: ${this.money.toLocaleString()}원`,
      );
    }
  }

  updateDayHUD() {
    if (this.dayText) {
      this.dayText.setText(
        `${this.dayNumber}일차`,
      );
    }

    if (this.rentText) {
      this.rentText.setText(
        `오늘의 집세 : ${this.currentRent.toLocaleString()}원`,
      );
    }

    // -------------------------------------------------------------------------
    // 전자시계: 08:00 ~ 23:00, 현실 1초 = 게임 속 1분
    // -------------------------------------------------------------------------

    if (this.hudClockText) {
      const elapsedMinutes = Phaser.Math.Clamp(
        Math.floor(this.dayElapsedMs / 1000),
        0,
        this.dayLengthMinutes,
      );

      const currentHour =
        this.dayStartHour +
        Math.floor(elapsedMinutes / 60);

      const currentMinute = elapsedMinutes % 60;

      const paddedHour = String(currentHour).padStart(2, '0');
      const paddedMinute = String(currentMinute).padStart(2, '0');

      this.hudClockText.setText(
        `${paddedHour}:${paddedMinute}`,
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

    this.inventoryNoticeText = this.add
      .text(0, 198, '', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
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
      this.inventoryNoticeText,
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
          imageSize: 60,
          countText,
          emptyMark,

          item: null,
        };

        // 마우스 입력을 받을 수 있도록 설정
        inner.setInteractive({
          useHandCursor: true,
        });

        // 아이템 위에 마우스를 올렸을 때
        inner.on('pointerover', (pointer) => {
          if (slotData.item) {
            this.showItemTooltip(pointer, slotData.item.name);
          }

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
          this.hideItemTooltip();

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
    // 방앗간 바깥의 어두운 화면
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
      .text(0, -300, '달토끼 방앗간', {
        fontFamily: 'sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // 탭 버튼: 떡방앗간 / 오색방앗간
    // -------------------------------------------------------------------------

    const riceTabButton = this.add
      .rectangle(-110, -258, 200, 40, 0x3f342a)
      .setStrokeStyle(3, 0xfde68a)
      .setInteractive({ useHandCursor: true });

    const riceTabText = this.add
      .text(-110, -258, '떡방앗간', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const colorTabButton = this.add
      .rectangle(110, -258, 200, 40, 0x241d2f)
      .setStrokeStyle(3, 0x6b7280)
      .setInteractive({ useHandCursor: true });

    const colorTabText = this.add
      .text(110, -258, '오색방앗간', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#9ca3af',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.millTabButtons = {
      rice: { button: riceTabButton, text: riceTabText },
      color: { button: colorTabButton, text: colorTabText },
    };

    riceTabButton.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
      this.switchMillTab('rice');
    });

    colorTabButton.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation();
      this.switchMillTab('color');
    });

    // -------------------------------------------------------------------------
    // 떡방앗간 (밀 → 기본 떡)
    // -------------------------------------------------------------------------

    const riceDescription = this.add
      .text(
        0,
        -222,
        '인벤토리의 밀을 클릭한 뒤 왼쪽 재료 슬롯에 넣으세요.',
        {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          color: '#d1d5db',
        },
      )
      .setOrigin(0.5);

    const inputOuter = this.add
      .rectangle(-190, -155, 110, 110, 0x8b8f99)
      .setStrokeStyle(4, 0xfde68a);

    const inputInner = this.add
      .rectangle(-190, -155, 98, 98, 0xc7c9cf);

    this.millInputIcon = this.add.graphics();
    this.millInputIcon.setPosition(-190, -155);

    this.millInputImage = this.add
      .image(-190, -155, 'tteok_basic')
      .setDisplaySize(72, 72)
      .setVisible(false);

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
      .setInteractive({ useHandCursor: true });

    inputHitArea.on('pointerover', (pointer) => {
      inputOuter.setStrokeStyle(6, 0xffffff);

      if (this.millInputType === 'wheat' && this.millInputCount > 0) {
        this.showItemTooltip(pointer, '밀');
      }
    });

    inputHitArea.on('pointerout', () => {
      inputOuter.setStrokeStyle(4, 0xfde68a);
      this.hideItemTooltip();
    });

    inputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleMillInputClick(pointer);
      },
    );

    const riceArrow = this.add
      .text(0, -155, '→', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const outputOuter = this.add
      .rectangle(190, -155, 110, 110, 0x8b8f99)
      .setStrokeStyle(4, 0x86efac);

    const outputInner = this.add
      .rectangle(190, -155, 98, 98, 0xc7c9cf);

    this.millOutputIcon = this.add.graphics();
    this.millOutputIcon.setPosition(190, -155);

    this.millOutputImage = this.add
      .image(190, -155, 'tteok_basic')
      .setDisplaySize(72, 72)
      .setVisible(false);

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
      .setInteractive({ useHandCursor: true });

    outputHitArea.on('pointerover', (pointer) => {
      outputOuter.setStrokeStyle(6, 0x86efac);

      if (this.millOutputCount > 0) {
        this.showItemTooltip(pointer, '기본 떡');
      }
    });

    outputHitArea.on('pointerout', () => {
      outputOuter.setStrokeStyle(4, 0x86efac);
      this.hideItemTooltip();
    });

    outputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleMillOutputClick();
      },
    );

    const riceProgressBackground = this.add.rectangle(
      0,
      -63,
      300,
      18,
      0x111827,
    );

    this.millProgressFill = this.add
      .rectangle(-150, -63, 300, 14, 0xf4d35e)
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

    this.riceMillRecipeContainer = this.add.container(0, 0, [
      riceDescription,
      inputOuter,
      inputInner,
      this.millInputIcon,
      this.millInputImage,
      this.millInputCountText,
      inputLabel,
      inputHitArea,
      riceArrow,
      outputOuter,
      outputInner,
      this.millOutputIcon,
      this.millOutputImage,
      this.millOutputCountText,
      outputLabel,
      outputHitArea,
      riceProgressBackground,
      this.millProgressFill,
      this.millProgressText,
      this.millNoticeText,
    ]);

    // -------------------------------------------------------------------------
    // 오색방앗간 (기본 떡 + 재료 → 색깔 떡)
    // -------------------------------------------------------------------------

    const colorDescription = this.add
      .text(
        0,
        -222,
        '기본 떡과 재료를 각각 슬롯에 넣으면 색깔 떡이 만들어져요.',
        {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          color: '#d1d5db',
        },
      )
      .setOrigin(0.5);

    const basicInputOuter = this.add
      .rectangle(-270, -155, 100, 100, 0x8b8f99)
      .setStrokeStyle(4, 0xfde68a);

    const basicInputInner = this.add
      .rectangle(-270, -155, 88, 88, 0xc7c9cf);

    this.colorMillInputBasicIcon = this.add.graphics();
    this.colorMillInputBasicIcon.setPosition(-270, -155);

    this.colorMillInputBasicImage = this.add
      .image(-270, -155, 'tteok_basic')
      .setDisplaySize(64, 64)
      .setVisible(false);

    this.colorMillInputBasicCountText = this.add
      .text(-238, -122, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#111827',
        fontStyle: 'bold',
      })
      .setOrigin(1, 1);

    const basicInputLabel = this.add
      .text(-270, -88, '기본 떡', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const basicInputHitArea = this.add
      .rectangle(-270, -155, 100, 100, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    basicInputHitArea.on('pointerover', (pointer) => {
      basicInputOuter.setStrokeStyle(6, 0xffffff);

      if (this.colorMillInputBasicCount > 0) {
        this.showItemTooltip(pointer, '기본 떡');
      }
    });

    basicInputHitArea.on('pointerout', () => {
      basicInputOuter.setStrokeStyle(4, 0xfde68a);
      this.hideItemTooltip();
    });

    basicInputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleColorMillBasicInputClick(pointer);
      },
    );

    const plusSign = this.add
      .text(-195, -155, '+', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const materialInputOuter = this.add
      .rectangle(-120, -155, 100, 100, 0x8b8f99)
      .setStrokeStyle(4, 0xc4b5fd);

    const materialInputInner = this.add
      .rectangle(-120, -155, 88, 88, 0xc7c9cf);

    this.colorMillInputMaterialIcon = this.add.graphics();
    this.colorMillInputMaterialIcon.setPosition(-120, -155);

    this.colorMillInputMaterialImage = this.add
      .image(-120, -155, 'tteok_basic')
      .setDisplaySize(64, 64)
      .setVisible(false);

    this.colorMillInputMaterialCountText = this.add
      .text(-88, -122, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#111827',
        fontStyle: 'bold',
      })
      .setOrigin(1, 1);

    const materialInputLabel = this.add
      .text(-120, -88, '재료', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const materialInputHitArea = this.add
      .rectangle(-120, -155, 100, 100, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    materialInputHitArea.on('pointerover', (pointer) => {
      materialInputOuter.setStrokeStyle(6, 0xffffff);

      if (
        this.colorMillInputMaterialType &&
        this.colorMillInputMaterialCount > 0
      ) {
        const materialItem = this.getInventoryItemData({
          type: this.colorMillInputMaterialType,
          count: 1,
        });

        this.showItemTooltip(pointer, materialItem.name);
      }
    });

    materialInputHitArea.on('pointerout', () => {
      materialInputOuter.setStrokeStyle(4, 0xc4b5fd);
      this.hideItemTooltip();
    });

    materialInputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleColorMillMaterialInputClick(pointer);
      },
    );

    const colorArrow = this.add
      .text(-15, -155, '→', {
        fontFamily: 'sans-serif',
        fontSize: '52px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const colorOutputOuter = this.add
      .rectangle(190, -155, 110, 110, 0x8b8f99)
      .setStrokeStyle(4, 0x86efac);

    const colorOutputInner = this.add
      .rectangle(190, -155, 98, 98, 0xc7c9cf);

    this.colorMillOutputIcon = this.add.graphics();
    this.colorMillOutputIcon.setPosition(190, -155);

    this.colorMillOutputImage = this.add
      .image(190, -155, 'tteok_basic')
      .setDisplaySize(72, 72)
      .setVisible(false);

    this.colorMillOutputCountText = this.add
      .text(225, -120, '', {
        fontFamily: 'sans-serif',
        fontSize: '19px',
        color: '#111827',
        fontStyle: 'bold',
      })
      .setOrigin(1, 1);

    const colorOutputLabel = this.add
      .text(190, -88, '완성된 떡', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const colorOutputHitArea = this.add
      .rectangle(190, -155, 110, 110, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    colorOutputHitArea.on('pointerover', (pointer) => {
      colorOutputOuter.setStrokeStyle(6, 0x86efac);

      if (this.colorMillOutputCount > 0 && this.colorMillOutputType) {
        const resultItem = this.getInventoryItemData({
          type: this.colorMillOutputType,
          count: 1,
        });

        this.showItemTooltip(pointer, resultItem.name);
      }
    });

    colorOutputHitArea.on('pointerout', () => {
      colorOutputOuter.setStrokeStyle(4, 0x86efac);
      this.hideItemTooltip();
    });

    colorOutputHitArea.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.handleColorMillOutputClick();
      },
    );

    const colorProgressBackground = this.add.rectangle(
      0,
      -63,
      300,
      18,
      0x111827,
    );

    this.colorMillProgressFill = this.add
      .rectangle(-150, -63, 300, 14, 0xc4b5fd)
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    this.colorMillProgressText = this.add
      .text(0, -40, '기본 떡과 재료를 넣으면 제작이 시작됩니다.', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.colorMillNoticeText = this.add
      .text(0, -10, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.colorMillRecipeContainer = this.add.container(0, 0, [
      colorDescription,
      basicInputOuter,
      basicInputInner,
      this.colorMillInputBasicIcon,
      this.colorMillInputBasicImage,
      this.colorMillInputBasicCountText,
      basicInputLabel,
      basicInputHitArea,
      plusSign,
      materialInputOuter,
      materialInputInner,
      this.colorMillInputMaterialIcon,
      this.colorMillInputMaterialImage,
      this.colorMillInputMaterialCountText,
      materialInputLabel,
      materialInputHitArea,
      colorArrow,
      colorOutputOuter,
      colorOutputInner,
      this.colorMillOutputIcon,
      this.colorMillOutputImage,
      this.colorMillOutputCountText,
      colorOutputLabel,
      colorOutputHitArea,
      colorProgressBackground,
      this.colorMillProgressFill,
      this.colorMillProgressText,
      this.colorMillNoticeText,
    ]);

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
      riceTabButton,
      riceTabText,
      colorTabButton,
      colorTabText,
      this.riceMillRecipeContainer,
      this.colorMillRecipeContainer,
      divider,
      inventoryTitle,
    ];

    // -------------------------------------------------------------------------
    // 방앗간 아래쪽 플레이어 인벤토리 15칸
    // -------------------------------------------------------------------------

    this.millInventorySlots = [];

    const cols = 5;
    const rows = 3;
    const slotSize = 72;
    const gap = 10;

    const startX =
      -((cols - 1) * (slotSize + gap)) / 2;

    const startY = 95;

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
          .setDisplaySize(48, 48)
          .setVisible(false);

        const countText = this.add
          .text(23, 23, '', {
            fontFamily: 'sans-serif',
            fontSize: '15px',
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
          imageSize: 48,
          icon,
          countText,
          item: null,
        };

        inner.on('pointerover', (pointer) => {
          if (slotData.item) {
            this.showItemTooltip(pointer, slotData.item.name);
          }

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
          this.hideItemTooltip();

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
      .text(0, 322, '[E] 방앗간 닫기', {
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

    this.switchMillTab('rice');

    this.updateInventoryPanel();
    this.updateMillMachineSlots();
    this.updateColorMillMachineSlots();
  }

  // 방앗간 탭(떡방앗간 / 오색방앗간) 전환
  switchMillTab(tab) {
    this.millTab = tab;

    this.riceMillRecipeContainer.setVisible(tab === 'rice');
    this.colorMillRecipeContainer.setVisible(tab === 'color');

    const activeColor = 0x3f342a;
    const inactiveColor = 0x241d2f;

    this.millTabButtons.rice.button.setFillStyle(
      tab === 'rice' ? activeColor : inactiveColor,
    );
    this.millTabButtons.rice.button.setStrokeStyle(
      3,
      tab === 'rice' ? 0xfde68a : 0x6b7280,
    );
    this.millTabButtons.rice.text.setColor(
      tab === 'rice' ? '#ffffff' : '#9ca3af',
    );

    this.millTabButtons.color.button.setFillStyle(
      tab === 'color' ? activeColor : inactiveColor,
    );
    this.millTabButtons.color.button.setStrokeStyle(
      3,
      tab === 'color' ? 0xfde68a : 0x6b7280,
    );
    this.millTabButtons.color.text.setColor(
      tab === 'color' ? '#ffffff' : '#9ca3af',
    );
  }

  createFridgePanel() {
    this.fridgeOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.55)
      .setDepth(219)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    this.fridgeOverlay.on('pointerdown', () => {
      if (this.heldInventoryItem) {
        this.releaseHeldInventoryItem();
      }
    });

    const background = this.add
      .rectangle(0, 0, 780, 660, 0x1b2f3a, 0.98)
      .setStrokeStyle(6, 0xbfe0f0)
      .setInteractive();

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();

        if (this.heldInventoryItem) {
          this.releaseHeldInventoryItem();
        }
      },
    );

    // -------------------------------------------------------------------------
    // 냉장고 상단 제목 및 설명
    // -------------------------------------------------------------------------

    const title = this.add
      .text(0, -295, '냉장고', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const description = this.add
      .text(
        0,
        -260,
        '떡을 클릭해서 집었다가 냉장고 칸에 놓으세요 (우클릭: 1개씩)',
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#d1d5db',
          wordWrap: {
            width: 700,
          },
        },
      )
      .setOrigin(0.5);

    this.fridgeCapacityText = this.add
      .text(0, -220, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#bfe0f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const children = [
      background,
      title,
      description,
      this.fridgeCapacityText,
    ];

    // -------------------------------------------------------------------------
    // 냉장고 슬롯 (5 x 2)
    // 보관 중 글씨와 겹치지 않도록 아래로 이동
    // -------------------------------------------------------------------------

    this.fridgeSlots = this.buildFridgeStyleSlotGrid({
      count: 10,
      cols: 5,
      startY: -160,
      slotSize: 64,
      gap: 10,
      dataSource: 'fridge',
      children,
    });

    // -------------------------------------------------------------------------
    // 구분선
    // -------------------------------------------------------------------------

    const divider = this.add.rectangle(
      0,
      -25,
      700,
      4,
      0xbfe0f0,
    );

    children.push(divider);

    // -------------------------------------------------------------------------
    // 플레이어 인벤토리 제목
    // -------------------------------------------------------------------------

    const inventoryTitle = this.add
      .text(0, 10, '플레이어 인벤토리', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(inventoryTitle);

    // -------------------------------------------------------------------------
    // 플레이어 인벤토리 슬롯 (5 x 3)
    // -------------------------------------------------------------------------

    this.fridgeInventorySlots = this.buildFridgeStyleSlotGrid({
      count: 15,
      cols: 5,
      startY: 55,
      slotSize: 64,
      gap: 10,
      dataSource: 'inventory',
      children,
    });

    // -------------------------------------------------------------------------
    // 알림 메시지
    // -------------------------------------------------------------------------

    this.fridgeNoticeText = this.add
      .text(0, 265, '', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    children.push(this.fridgeNoticeText);

    // -------------------------------------------------------------------------
    // 닫기 안내
    // -------------------------------------------------------------------------

    const closeGuide = this.add
      .text(0, 300, '[E] 냉장고 닫기', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#d1d5db',
      })
      .setOrigin(0.5);

    children.push(closeGuide);

    // -------------------------------------------------------------------------
    // 냉장고 패널
    // -------------------------------------------------------------------------

    this.fridgePanel = this.add.container(
      640,
      360,
      children,
    );

    this.fridgePanel
      .setDepth(220)
      .setScrollFactor(0)
      .setVisible(false);
  }

  // 냉장고 패널 안에서 쓰는 슬롯 그리드를 만들어서 배열로 반환 (기존 인벤토리 슬롯과 같은 구조)
  buildFridgeStyleSlotGrid({
    count,
    cols,
    startY,
    dataSource,
    children,
    slotSize = 82,
    gap = 14,
  }) {
    const rows = Math.ceil(count / cols);
    const startX = -((cols - 1) * (slotSize + gap)) / 2;

    const slots = [];

    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = startX + col * (slotSize + gap);
      const y = startY + row * (slotSize + gap);

      const outer = this.add
        .rectangle(0, 0, slotSize, slotSize, 0x8b8f99)
        .setStrokeStyle(3, 0xe5e7eb);

      const inner = this.add
        .rectangle(0, 0, slotSize - 8, slotSize - 8, 0xc7c9cf)
        .setInteractive({ useHandCursor: true });

      const icon = this.add.graphics();

      const itemImage = this.add
        .image(0, 0, 'tteok_basic')
        .setDisplaySize(slotSize - 22, slotSize - 22)
        .setVisible(false);

      const countText = this.add
        .text(slotSize / 2 - 5, slotSize / 2 - 5, '', {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#111827',
          fontStyle: 'bold',
        })
        .setOrigin(1, 1);

      const slotContainer = this.add.container(x, y, [
        outer,
        inner,
        itemImage,
        icon,
        countText,
      ]);

      children.push(slotContainer);

      const slotData = {
        index,
        dataSource,
        container: slotContainer,
        outer,
        inner,
        itemImage,
        imageSize: slotSize - 22,
        icon,
        countText,
        item: null,
      };

      inner.on('pointerover', (pointer) => {
        if (slotData.item) {
          this.showItemTooltip(pointer, slotData.item.name);
        }

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
        this.hideItemTooltip();

        if (
          this.heldItemSourceSlot &&
          this.heldItemSourceSlot.index === slotData.index &&
          (this.heldItemSourceSlot.dataSource || 'inventory') ===
            slotData.dataSource
        ) {
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
          this.handleInventorySlotClick(slotData, pointer);
        },
      );

      slots.push(slotData);
    }

    return slots;
  }

  openFridgePanel() {
    this.fridgeOpen = true;

    this.player.body.setVelocity(0);
    this.interactionText.setVisible(false);

    this.fridgeOverlay.setVisible(true);
    this.fridgePanel.setVisible(true);

    this.updateInventoryPanel();
  }

  closeFridgePanel() {
    if (this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }

    this.hideItemTooltip();

    this.fridgeOpen = false;

    this.fridgeOverlay.setVisible(false);
    this.fridgePanel.setVisible(false);
  }

  updateFridgeCapacityText() {
    this.fridgeCapacityText.setText(
      `보관 중: ${this.getFridgeTotalCount()} / ${this.getFridgeCapacity()}개 (Lv${this.fridgeLevel})`,
    );
  }

  showFridgeNotice(message, duration = 1500) {
    if (!this.fridgeNoticeText) {
      return;
    }

    this.fridgeNoticeText.setText(message);

    this.time.delayedCall(duration, () => {
      if (this.fridgeNoticeText) {
        this.fridgeNoticeText.setText('');
      }
    });
  }

  // 인벤토리 패널 안에서 쓰는 알림 (버리기, 다른 종류 칸 등)
  showInventoryNotice(message, duration = 1500) {
    if (!this.inventoryNoticeText) {
      return;
    }

    this.inventoryNoticeText.setText(message);

    this.time.delayedCall(duration, () => {
      if (this.inventoryNoticeText) {
        this.inventoryNoticeText.setText('');
      }
    });
  }

  // 하루 흐름 시간을 누적하고 시계 바늘을 갱신 (실제 날짜 진행은 침대에서 잠을 잘 때만 일어남)
  updateDayClock() {
    // 델타 누적이 아니라 실제 시각 차이로 계산 → 탭이 백그라운드에 있다가
    // 돌아와도 그동안 흐른 시간이 그대로 반영됨 (프레임이 안 돌아 멈춰있지 않음)
    this.dayElapsedMs = Phaser.Math.Clamp(
      Date.now() - this.dayStartTimestamp,
      0,
      this.dayDurationMs,
    );

    this.updateDayHUD();

    // 23시(하루 끝)가 되면 자동으로 잠듦
    if (
      this.dayElapsedMs >= this.dayDurationMs &&
      !this.isSleeping
    ) {
      this.triggerForcedSleep();
    }
  }

  createShopPanel() {
    this.shopOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.58)
      .setDepth(299)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    this.shopOverlay.on('pointerdown', () => {
      if (!this.shopConfirmOpen && !this.shopQuantityOpen) {
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

    this.shopTitleText = this.add
      .text(0, -298, '달나라 떡 상점', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.shopMoneyText = this.add
      .text(-490, -298, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffe07a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.shopNoticeText = this.add
      .text(0, 250, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffd7a8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // 뒤로가기 버튼 (카테고리 목록 화면에서만 보임)
    // 카드 목록이 시작되는 y=-227.5보다 충분히 위쪽에 배치해서 카드에 가리지 않게 함
    // -------------------------------------------------------------------------

    const backButton = this.add
      .rectangle(-440, -258, 150, 36, 0x374151)
      .setStrokeStyle(2, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const backButtonText = this.add
      .text(-440, -258, '◀ 상점 목록', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    backButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.backToShopCategories();
      },
    );

    this.shopBackButton = backButton;
    this.shopBackButtonText = backButtonText;

    // -------------------------------------------------------------------------
    // 카테고리 선택 화면
    // -------------------------------------------------------------------------

    const categoryDefinitions = [
      {
        key: 'tool',
        color: 0x5f6b8a,
      },
      {
        key: 'seed',
        color: 0x4f7a56,
      },
      {
        key: 'tteok',
        color: 0x8a6a3f,
      },
      {
        key: 'lock',
        color: 0x7a4f4f,
      },
    ];

    const categoryPositions = [
      { x: -255, y: -125 },
      { x: 255, y: -125 },
      { x: -255, y: 105 },
      { x: 255, y: 105 },
    ];

    const categoryScreenChildren = [];

    categoryDefinitions.forEach((definition, index) => {
      const position = categoryPositions[index];
      const category = this.shopCategories[definition.key];

      const cardBackground = this.add
        .rectangle(0, 0, 470, 205, definition.color)
        .setStrokeStyle(3, 0xf4d8a5)
        .setInteractive({ useHandCursor: true });

      const nameText = this.add
        .text(0, -30, category.name, {
          fontFamily: 'sans-serif',
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const descriptionText = this.add
        .text(0, 20, category.description, {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#e5e7eb',
          align: 'center',
          wordWrap: {
            width: 380,
          },
        })
        .setOrigin(0.5);

      cardBackground.on('pointerover', () => {
        cardBackground.setStrokeStyle(4, 0xffffff);
      });

      cardBackground.on('pointerout', () => {
        cardBackground.setStrokeStyle(3, 0xf4d8a5);
      });

      cardBackground.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();
          this.openShopCategory(definition.key);
        },
      );

      const categoryContainer = this.add.container(
        position.x,
        position.y,
        [cardBackground, nameText, descriptionText],
      );

      categoryScreenChildren.push(categoryContainer);
    });

    this.shopCategoryScreen = this.add.container(
      0,
      0,
      categoryScreenChildren,
    );

    // -------------------------------------------------------------------------
    // 상품 목록 화면
    // -------------------------------------------------------------------------

    this.shopPageText = this.add
      .text(490, -258, '', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#d1d5db',
      })
      .setOrigin(1, 0.5);

    const children = [
      background,
      this.shopCategoryScreen,
      this.shopTitleText,
      this.shopMoneyText,
      this.shopNoticeText,
      this.shopBackButton,
      this.shopBackButtonText,
    ];

    const listChildren = [this.shopPageText];

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

      const iconGraphics = this.add.graphics();
      iconGraphics.setPosition(-155, -5);
      iconGraphics.setScale(2.2);

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

      const requiredLevelText = this.add
        .text(-65, 30, '', {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#fca5a5',
          fontStyle: 'bold',
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
        .rectangle(-45, 60, 145, 48, 0x15803d)
        .setStrokeStyle(2, 0x86efac)
        .setInteractive({ useHandCursor: true });

      const sellText = this.add
        .text(-45, 60, '판매', {
          fontFamily: 'sans-serif',
          fontSize: '19px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const sellAllButton = this.add
        .rectangle(125, 60, 145, 48, 0x166534)
        .setStrokeStyle(2, 0x86efac)
        .setInteractive({ useHandCursor: true });

      const sellAllText = this.add
        .text(125, 60, '전체판매', {
          fontFamily: 'sans-serif',
          fontSize: '17px',
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
          iconGraphics,
          nameText,
          priceText,
          changeText,
          ownedText,
          requiredLevelText,
          buyButton,
          buyText,
          sellButton,
          sellText,
          sellAllButton,
          sellAllText,
        ],
      );

      const card = {
        container: cardContainer,
        icon,
        iconGraphics,
        nameText,
        priceText,
        changeText,
        ownedText,
        requiredLevelText,
        buyButton,
        buyText,
        sellButton,
        sellText,
        sellAllButton,
        sellAllText,
        item: null,
      };

      // 구매/판매는 먼저 수량 선택창을 연다
      buyButton.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();

          if (card.item) {
            this.openShopQuantitySelector(
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
            this.openShopQuantitySelector(
              card.item,
              'sell',
            );
          }
        },
      );

      // 전체판매는 수량 선택 없이 보유 수량 전체로 바로 거래 확인창을 연다
      sellAllButton.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();

          if (!card.item) {
            return;
          }

          const owned = this.getTotalItemCount(
            card.item.type,
          );

          this.requestShopTransaction(
            card.item,
            'sell',
            owned,
          );
        },
      );

      listChildren.push(cardContainer);
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

    listChildren.push(
      previousButton,
      previousText,
      nextButton,
      nextText,
    );

    this.shopListContainer = this.add.container(
      0,
      0,
      listChildren,
    );

    // 카드 목록은 카테고리 화면 바로 뒤(=UI 크롬보다 아래)에 삽입해서
    // 카드가 뒤로가기 버튼이나 제목을 절대 가리지 않도록 함
    children.splice(2, 0, this.shopListContainer);

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
    this.createShopQuantitySelector();
    this.showShopCategoryScreen();
  }

  // -------------------------------------------------------------------------
  // 카테고리 화면 <-> 상품 목록 화면 전환
  // -------------------------------------------------------------------------

  showShopCategoryScreen() {
    this.shopCategoryKey = null;

    this.shopTitleText.setText('달나라 떡 상점');

    this.shopCategoryScreen.setVisible(true);
    this.shopListContainer.setVisible(false);

    this.shopBackButton.setVisible(false);
    this.shopBackButtonText.setVisible(false);
  }

  openShopCategory(key) {
    if (this.shopConfirmOpen || this.shopQuantityOpen) {
      return;
    }

    this.shopCategoryKey = key;
    this.shopPage = 0;

    const category = this.shopCategories[key];

    this.shopTitleText.setText(category.name);

    this.shopCategoryScreen.setVisible(false);
    this.shopListContainer.setVisible(true);

    this.shopBackButton.setVisible(true);
    this.shopBackButtonText.setVisible(true);

    this.updateShopPage();
  }

  backToShopCategories() {
    if (this.shopConfirmOpen || this.shopQuantityOpen) {
      return;
    }

    this.showShopCategoryScreen();
  }

  getCurrentShopItems() {
    if (!this.shopCategoryKey) {
      return [];
    }

    return this.shopCategories[this.shopCategoryKey].items;
  }
  getShopPrice(item) {
    const changePercent = item.changePercent || 0;

    return Math.max(
      1,
      Math.round(
        item.basePrice *
        (1 + changePercent / 100),
      ),
    );
  }

  changeShopPage(direction) {
    const items = this.getCurrentShopItems();

    const pageCount = Math.max(
      1,
      Math.ceil(
        items.length /
        this.shopItemsPerPage,
      ),
    );

    this.shopPage =
      (this.shopPage + direction + pageCount) %
      pageCount;

    this.updateShopPage();
  }

  updateShopPage() {
    if (!this.shopCards.length || !this.shopCategoryKey) {
      return;
    }

    const items = this.getCurrentShopItems();

    const pageCount = Math.max(
      1,
      Math.ceil(
        items.length /
        this.shopItemsPerPage,
      ),
    );

    this.shopPageText.setText(
      `${this.shopPage + 1} / ${pageCount}`,
    );

    this.updateMoneyHUD();

    const start =
      this.shopPage *
      this.shopItemsPerPage;

    this.shopCards.forEach((card, index) => {
      const item = items[start + index];

      card.item = item || null;
      card.container.setVisible(Boolean(item));

      if (!item) {
        return;
      }

      const price = this.getShopPrice(item);
      const owned = this.getTotalItemCount(item.type);

      // 이미지가 있으면 이미지, 없으면 임시 아이콘(도형)을 사용
      if (item.imageKey) {
        card.icon
          .setTexture(item.imageKey)
          .setDisplaySize(125, 125)
          .setVisible(true);
        card.iconGraphics.clear().setVisible(false);
      } else {
        card.icon.setVisible(false);
        card.iconGraphics.setVisible(true);
        this.drawInventoryIcon(card.iconGraphics, item.type);
      }

      const requiredLevel = item.requiredHouseLevel || 0;
      const levelLocked =
        requiredLevel > 0 && this.houseLevel < requiredLevel;

      // 조건이 있는 아이템은 이름 폰트를 살짝 줄여서 옆에 붙는 조건 문구와 함께 잘 들어오게 함
      card.nameText.setFontSize(requiredLevel > 0 ? '21px' : '23px');
      card.nameText.setText(item.name);

      if (levelLocked) {
        // 이름 오른쪽에 빨간 글씨로 조건을 붙여서 표시. 조건이 풀리면 이 텍스트는 사라짐
        card.requiredLevelText.setColor('#fca5a5');
        card.requiredLevelText.setFontSize('15px');
        card.requiredLevelText.setText(
          `(필요조건 : Lv${requiredLevel})`,
        );
        card.requiredLevelText.setPosition(
          card.nameText.x + card.nameText.displayWidth + 8,
          card.nameText.y,
        );
      } else {
        card.requiredLevelText.setText('');
      }

      card.priceText.setText(
        `${price.toLocaleString()}원`,
      );

      const hasChangePercent =
        typeof item.changePercent === 'number';

      if (hasChangePercent) {
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
      } else {
        card.changeText.setText('');
      }

      if (item.upgradesFridgeTo) {
        card.ownedText.setText(
          `현재 냉장고 Lv${this.fridgeLevel}`,
        );
      } else {
        card.ownedText.setText(
          `보유: ${owned}개`,
        );
      }

      // 구매/판매 버튼 표시 여부 (떡상점 = 판매+전체판매, 자물쇠/도구/씨앗 = 구매만)
      const canBuyThisItem = Boolean(item.buyable);
      const canSellThisItem = Boolean(item.sellable);

      card.buyButton.setVisible(canBuyThisItem);
      card.buyText.setVisible(canBuyThisItem);
      card.sellButton.setVisible(canSellThisItem);
      card.sellText.setVisible(canSellThisItem);
      card.sellAllButton.setVisible(canSellThisItem);
      card.sellAllText.setVisible(canSellThisItem);

      // 구매만 가능하면 구매 버튼을 가운데로
      const buyOnlyX = 40;

      card.buyButton.setPosition(buyOnlyX, 60);
      card.buyText.setPosition(buyOnlyX, 60);

      // 판매 가능하면 판매(왼쪽) + 전체판매(오른쪽)
      card.sellButton.setPosition(-45, 60);
      card.sellText.setPosition(-45, 60);
      card.sellAllButton.setPosition(125, 60);
      card.sellAllText.setPosition(125, 60);

      // 집 레벨 조건 미달이면 구매 버튼을 회색으로, 조건이 풀리면 다시 파란색 "구매"로
      if (levelLocked) {
        card.buyButton.setFillStyle(0x4b5563);
        card.buyText.setText('구매 불가');
      } else {
        card.buyButton.setFillStyle(0x2563eb);
        card.buyText.setText('구매');
      }
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

  createShopQuantitySelector() {
    this.shopQuantityOverlay = this.add
      .rectangle(640, 360, 1280, 720, 0x000000, 0.75)
      .setDepth(450)
      .setScrollFactor(0)
      .setVisible(false)
      .setInteractive();

    this.shopQuantityOverlay.on('pointerdown', () => {
      this.cancelShopQuantitySelector();
    });

    const background = this.add
      .rectangle(0, 0, 520, 430, 0x1f2937)
      .setStrokeStyle(5, 0xf4d8a5)
      .setInteractive();

    background.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
      },
    );

    this.shopQuantityTitleText = this.add
      .text(0, -170, '', {
        fontFamily: 'sans-serif',
        fontSize: '27px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.shopQuantitySubText = this.add
      .text(0, -128, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#d1d5db',
      })
      .setOrigin(0.5);

    this.shopQuantityValueText = this.add
      .text(0, -48, '1', {
        fontFamily: 'sans-serif',
        fontSize: '60px',
        color: '#ffe07a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // -10 / -1 / +1 / +10 조절 버튼
    // -------------------------------------------------------------------------

    const adjustButtonDefinitions = [
      { label: '-10', delta: -10, x: -165 },
      { label: '-1', delta: -1, x: -55 },
      { label: '+1', delta: 1, x: 55 },
      { label: '+10', delta: 10, x: 165 },
    ];

    const adjustButtonChildren = [];

    adjustButtonDefinitions.forEach((definition) => {
      const button = this.add
        .rectangle(definition.x, 10, 90, 46, 0x374151)
        .setStrokeStyle(2, 0xd1d5db)
        .setInteractive({ useHandCursor: true });

      const text = this.add
        .text(definition.x, 10, definition.label, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      button.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();
          this.adjustShopQuantity(definition.delta);
        },
      );

      adjustButtonChildren.push(button, text);
    });

    const maxButton = this.add
      .rectangle(0, 70, 170, 42, 0x374151)
      .setStrokeStyle(2, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const maxButtonText = this.add
      .text(0, 70, '최대', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    maxButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.setShopQuantityMax();
      },
    );

    const guideText = this.add
      .text(
        0,
        112,
        '숫자 키로 직접 입력할 수도 있어요 (Enter 확인 · Esc 취소)',
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#9ca3af',
        },
      )
      .setOrigin(0.5);

    // -------------------------------------------------------------------------
    // 취소 / 확인 버튼
    // -------------------------------------------------------------------------

    const cancelButton = this.add
      .rectangle(-110, 158, 180, 54, 0x4b5563)
      .setStrokeStyle(3, 0xd1d5db)
      .setInteractive({ useHandCursor: true });

    const cancelText = this.add
      .text(-110, 158, '취소', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const confirmButton = this.add
      .rectangle(110, 158, 180, 54, 0x2563eb)
      .setStrokeStyle(3, 0x93c5fd)
      .setInteractive({ useHandCursor: true });

    const confirmText = this.add
      .text(110, 158, '확인', {
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
        this.cancelShopQuantitySelector();
      },
    );

    confirmButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation();
        this.confirmShopQuantitySelector();
      },
    );

    this.shopQuantityPanel = this.add.container(
      640,
      360,
      [
        background,
        this.shopQuantityTitleText,
        this.shopQuantitySubText,
        this.shopQuantityValueText,
        ...adjustButtonChildren,
        maxButton,
        maxButtonText,
        guideText,
        cancelButton,
        cancelText,
        confirmButton,
        confirmText,
      ],
    );

    this.shopQuantityPanel
      .setDepth(460)
      .setScrollFactor(0)
      .setVisible(false);

    // 수량 선택창이 열려 있는 동안에만 숫자 키 입력을 처리
    this.input.keyboard.on('keydown', (event) => {
      this.handleShopQuantityKeydown(event);
    });
  }

  openShopQuantitySelector(item, action) {
    if (action === 'buy' && !item.buyable) {
      return;
    }

    if (action === 'sell' && !item.sellable) {
      return;
    }

    const requiredLevel = item.requiredHouseLevel || 0;

    if (
      action === 'buy' &&
      requiredLevel > 0 &&
      this.houseLevel < requiredLevel
    ) {
      this.showShopNotice(
        `집 Lv${requiredLevel}부터 구매할 수 있습니다.`,
      );
      return;
    }

    // 냉장고 등급 업그레이드는 수량 개념이 없어서 바로 거래 확인창으로
    if (item.upgradesFridgeTo) {
      this.requestShopTransaction(item, action, 1);
      return;
    }

    const price = this.getShopPrice(item);

    this.shopQuantityItem = item;
    this.shopQuantityAction = action;
    this.shopQuantityTyping = false;

    if (action === 'buy') {
      this.shopQuantityMax = Math.max(
        1,
        Math.floor(this.money / price),
      );
    } else {
      this.shopQuantityMax = Math.max(
        1,
        this.getTotalItemCount(item.type),
      );
    }

    this.shopQuantityValue = 1;

    const actionText = action === 'buy' ? '구매' : '판매';

    this.shopQuantityTitleText.setText(
      `${item.name} ${actionText}`,
    );

    if (action === 'buy') {
      this.shopQuantitySubText.setText(
        `개당 ${price.toLocaleString()}원 · 보유금 ${this.money.toLocaleString()}원`,
      );
    } else {
      const owned = this.getTotalItemCount(item.type);

      this.shopQuantitySubText.setText(
        `개당 ${price.toLocaleString()}원 · 보유 수량 ${owned}개`,
      );
    }

    this.updateShopQuantityDisplay();

    this.shopQuantityOpen = true;
    this.shopQuantityOverlay.setVisible(true);
    this.shopQuantityPanel.setVisible(true);
  }

  adjustShopQuantity(delta) {
    if (!this.shopQuantityOpen) {
      return;
    }

    this.shopQuantityTyping = false;

    this.shopQuantityValue = Phaser.Math.Clamp(
      this.shopQuantityValue + delta,
      1,
      this.shopQuantityMax,
    );

    this.updateShopQuantityDisplay();
  }

  setShopQuantityMax() {
    if (!this.shopQuantityOpen) {
      return;
    }

    this.shopQuantityTyping = false;
    this.shopQuantityValue = this.shopQuantityMax;

    this.updateShopQuantityDisplay();
  }

  updateShopQuantityDisplay() {
    if (!this.shopQuantityValueText) {
      return;
    }

    this.shopQuantityValueText.setText(
      `${this.shopQuantityValue}`,
    );
  }

  handleShopQuantityKeydown(event) {
    if (!this.shopQuantityOpen) {
      return;
    }

    // 숫자 키 (메인 키보드 + 넘버패드)
    if (/^Digit[0-9]$/.test(event.code)) {
      const digit = Number(event.code.replace('Digit', ''));
      this.typeShopQuantityDigit(digit);
      return;
    }

    if (/^Numpad[0-9]$/.test(event.code)) {
      const digit = Number(event.code.replace('Numpad', ''));
      this.typeShopQuantityDigit(digit);
      return;
    }

    if (event.code === 'Backspace') {
      this.shopQuantityTyping = true;

      this.shopQuantityValue = Math.floor(
        this.shopQuantityValue / 10,
      );

      this.updateShopQuantityDisplay();
      return;
    }

    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      this.confirmShopQuantitySelector();
      return;
    }

    if (event.code === 'Escape') {
      this.cancelShopQuantitySelector();
    }
  }

  typeShopQuantityDigit(digit) {
    if (!this.shopQuantityTyping) {
      this.shopQuantityValue = digit;
      this.shopQuantityTyping = true;
    } else {
      const next = this.shopQuantityValue * 10 + digit;
      this.shopQuantityValue = Math.min(
        next,
        this.shopQuantityMax,
      );
    }

    this.updateShopQuantityDisplay();
  }

  confirmShopQuantitySelector() {
    if (!this.shopQuantityOpen) {
      return;
    }

    const item = this.shopQuantityItem;
    const action = this.shopQuantityAction;

    const quantity = Phaser.Math.Clamp(
      this.shopQuantityValue || 1,
      1,
      this.shopQuantityMax,
    );

    this.closeShopQuantitySelector();

    this.requestShopTransaction(item, action, quantity);
  }

  cancelShopQuantitySelector() {
    if (!this.shopQuantityOpen) {
      return;
    }

    this.closeShopQuantitySelector();
  }

  closeShopQuantitySelector() {
    this.shopQuantityOpen = false;
    this.shopQuantityItem = null;
    this.shopQuantityAction = null;

    this.shopQuantityOverlay.setVisible(false);
    this.shopQuantityPanel.setVisible(false);
  }

  requestShopTransaction(item, action, requestedQuantity = 1) {
    if (action === 'buy' && !item.buyable) {
      return;
    }

    if (action === 'sell' && !item.sellable) {
      return;
    }

    const requiredLevel = item.requiredHouseLevel || 0;

    if (
      action === 'buy' &&
      requiredLevel > 0 &&
      this.houseLevel < requiredLevel
    ) {
      this.showShopNotice(
        `집 Lv${requiredLevel}부터 구매할 수 있습니다.`,
      );
      return;
    }

    const price = this.getShopPrice(item);
    let quantity = requestedQuantity;
    let canExecute = true;
    let reason = '';

    if (
      action === 'buy' &&
      item.upgradesFridgeTo &&
      this.fridgeLevel >= item.upgradesFridgeTo
    ) {
      quantity = 1;
      canExecute = false;
      reason = '이미 보유한 냉장고 등급입니다.';
    }

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
      !item.upgradesFridgeTo &&
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

      if (item.upgradesFridgeTo) {
        this.fridgeLevel = item.upgradesFridgeTo;

        if (this.fridgeCapacityText) {
          this.updateFridgeCapacityText();
        }
      } else {
        this.addItemToInventory(
          item.type,
          quantity,
        );
      }
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

      this.recordDailySale(item, quantity, totalPrice);
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

    // 상점을 열면 항상 카테고리 선택 화면부터 보여줌
    this.showShopCategoryScreen();
  }

  closeShop() {
    if (this.shopQuantityOpen) {
      this.cancelShopQuantitySelector();
    }

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
    this.updateColorMillMachineSlots();
  }

  closeRiceCakeMill() {
    if (this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }

    this.hideItemTooltip();

    this.millOpen = false;

    this.millOverlay.setVisible(false);
    this.millPanel.setVisible(false);
  }

  handleMillInputClick(pointer) {
    // 좌클릭과 우클릭만 허용
    if (pointer.button !== 0 && pointer.button !== 2) {
      return;
    }

    // 아무것도 안 들고 있는데 슬롯에 밀이 있다면: 도로 꺼내기
    if (!this.heldInventoryItem) {
      if (this.millInputCount <= 0) {
        this.showMillNotice(
          '아래 인벤토리에서 밀을 먼저 클릭하세요.',
        );
        return;
      }

      const withdrawAmount =
        pointer.button === 2
          ? 1
          : this.millInputCount;

      if (!this.addItemToInventory('wheat', withdrawAmount)) {
        this.showMillNotice('인벤토리에 빈칸이 없습니다.');
        return;
      }

      this.millInputCount -= withdrawAmount;

      if (this.millInputCount <= 0) {
        this.millInputCount = 0;
        this.millInputType = null;
      }

      this.updateInventoryHUD();
      this.updateMillMachineSlots();

      this.showMillNotice(
        `밀 ${withdrawAmount}개를 꺼냈습니다.`,
      );
      return;
    }

    if (!this.heldItemSourceSlot) {
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

    // 제작 도중 재료를 도로 꺼내서 0이 됐다면 완성 없이 취소
    if (this.millInputCount <= 0) {
      this.millInputCount = 0;
      this.millInputType = null;

      this.updateMillMachineSlots();
      return;
    }

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
    if (
      this.millInputType === 'wheat' &&
      this.millInputCount > 0
    ) {
      this.setSlotIconDisplay(
        this.millInputIcon,
        this.millInputImage,
        'wheat',
      );

      this.millInputCountText.setText(
        `x${this.millInputCount}`,
      );
    } else {
      this.millInputIcon.clear();
      this.millInputImage.setVisible(false);
      this.millInputCountText.setText('');
    }

    // 결과 슬롯
    if (this.millOutputCount > 0) {
      this.setSlotIconDisplay(
        this.millOutputIcon,
        this.millOutputImage,
        'ricecake',
      );

      this.millOutputCountText.setText(
        `x${this.millOutputCount}`,
      );
    } else {
      this.millOutputIcon.clear();
      this.millOutputImage.setVisible(false);
      this.millOutputCountText.setText('');
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

  // -------------------------------------------------------------------------
  // 오색방앗간: 기본 떡 + 재료 -> 색깔 떡
  // -------------------------------------------------------------------------

  showColorMillNotice(message, duration = 1400) {
    if (!this.colorMillNoticeText) {
      return;
    }

    this.colorMillNoticeText.setText(message);

    this.time.delayedCall(duration, () => {
      if (this.colorMillNoticeText) {
        this.colorMillNoticeText.setText('');
      }
    });
  }

  handleColorMillBasicInputClick(pointer) {
    if (pointer.button !== 0 && pointer.button !== 2) {
      return;
    }

    // 아무것도 안 들고 있는데 슬롯에 기본 떡이 있다면: 도로 꺼내기
    if (!this.heldInventoryItem) {
      if (this.colorMillInputBasicCount <= 0) {
        this.showColorMillNotice(
          '아래 인벤토리에서 기본 떡을 먼저 클릭하세요.',
        );
        return;
      }

      const withdrawAmount =
        pointer.button === 2
          ? 1
          : this.colorMillInputBasicCount;

      if (!this.addItemToInventory('ricecake', withdrawAmount)) {
        this.showColorMillNotice('인벤토리에 빈칸이 없습니다.');
        return;
      }

      this.colorMillInputBasicCount -= withdrawAmount;

      this.updateInventoryHUD();
      this.updateColorMillMachineSlots();

      this.showColorMillNotice(
        `기본 떡 ${withdrawAmount}개를 꺼냈습니다.`,
      );
      return;
    }

    if (!this.heldItemSourceSlot) {
      return;
    }

    if (this.heldInventoryItem.type !== 'ricecake') {
      this.showColorMillNotice(
        '이 슬롯에는 기본 떡만 넣을 수 있습니다.',
      );
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;
    const sourceStack = this.inventoryData[sourceIndex];

    if (
      !sourceStack ||
      sourceStack.type !== 'ricecake' ||
      sourceStack.count <= 0
    ) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();

      this.showColorMillNotice('투입할 기본 떡이 없습니다.');
      return;
    }

    const amountToAdd =
      pointer.button === 2 ? 1 : sourceStack.count;

    this.colorMillInputBasicCount += amountToAdd;

    sourceStack.count -= amountToAdd;

    if (sourceStack.count <= 0) {
      this.inventoryData[sourceIndex] = null;
      this.clearHeldInventoryItem();
    } else {
      this.heldInventoryItem.count = sourceStack.count;
      this.updateHeldItemPreview();
    }

    this.updateInventoryHUD();
    this.updateColorMillMachineSlots();
    this.startNextColorMillCraft();

    this.showColorMillNotice(
      `기본 떡 ${amountToAdd}개를 투입했습니다.`,
    );
  }

  handleColorMillMaterialInputClick(pointer) {
    if (pointer.button !== 0 && pointer.button !== 2) {
      return;
    }

    // 아무것도 안 들고 있는데 슬롯에 재료가 있다면: 도로 꺼내기
    if (!this.heldInventoryItem) {
      if (
        !this.colorMillInputMaterialType ||
        this.colorMillInputMaterialCount <= 0
      ) {
        this.showColorMillNotice(
          '아래 인벤토리에서 재료를 먼저 클릭하세요.',
        );
        return;
      }

      const withdrawAmount =
        pointer.button === 2
          ? 1
          : this.colorMillInputMaterialCount;

      if (
        !this.addItemToInventory(
          this.colorMillInputMaterialType,
          withdrawAmount,
        )
      ) {
        this.showColorMillNotice('인벤토리에 빈칸이 없습니다.');
        return;
      }

      const withdrawnItem = this.getInventoryItemData({
        type: this.colorMillInputMaterialType,
        count: 1,
      });

      this.colorMillInputMaterialCount -= withdrawAmount;

      if (this.colorMillInputMaterialCount <= 0) {
        this.colorMillInputMaterialCount = 0;
        this.colorMillInputMaterialType = null;
      }

      this.updateInventoryHUD();
      this.updateColorMillMachineSlots();

      this.showColorMillNotice(
        `${withdrawnItem.name} ${withdrawAmount}개를 꺼냈습니다.`,
      );
      return;
    }

    if (!this.heldItemSourceSlot) {
      return;
    }

    const heldType = this.heldInventoryItem.type;

    if (!this.materialToTteok[heldType]) {
      this.showColorMillNotice(
        '이 슬롯에는 색깔 떡 재료만 넣을 수 있습니다.',
      );
      return;
    }

    if (
      this.colorMillInputMaterialType &&
      this.colorMillInputMaterialType !== heldType
    ) {
      this.showColorMillNotice(
        '이미 다른 재료가 투입되어 있습니다. 다 쓴 뒤에 넣어주세요.',
      );
      return;
    }

    const sourceIndex = this.heldItemSourceSlot.index;
    const sourceStack = this.inventoryData[sourceIndex];

    if (
      !sourceStack ||
      sourceStack.type !== heldType ||
      sourceStack.count <= 0
    ) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();

      this.showColorMillNotice('투입할 재료가 없습니다.');
      return;
    }

    const amountToAdd =
      pointer.button === 2 ? 1 : sourceStack.count;

    this.colorMillInputMaterialType = heldType;
    this.colorMillInputMaterialCount += amountToAdd;

    sourceStack.count -= amountToAdd;

    if (sourceStack.count <= 0) {
      this.inventoryData[sourceIndex] = null;
      this.clearHeldInventoryItem();
    } else {
      this.heldInventoryItem.count = sourceStack.count;
      this.updateHeldItemPreview();
    }

    this.updateInventoryHUD();
    this.updateColorMillMachineSlots();
    this.startNextColorMillCraft();

    const materialItem = this.getInventoryItemData({
      type: heldType,
      count: 1,
    });

    this.showColorMillNotice(
      `${materialItem.name} ${amountToAdd}개를 투입했습니다.`,
    );
  }

  startNextColorMillCraft() {
    if (this.colorMillCrafting) {
      return;
    }

    if (
      this.colorMillInputBasicCount <= 0 ||
      this.colorMillInputMaterialCount <= 0 ||
      !this.colorMillInputMaterialType
    ) {
      return;
    }

    const resultType =
      this.materialToTteok[this.colorMillInputMaterialType];

    // 결과 슬롯에 다른 색깔 떡이 이미 남아있다면, 그걸 먼저 가져가야 함
    // (안 그러면 다른 색깔 떡끼리 개수가 섞여버림)
    if (
      this.colorMillOutputCount > 0 &&
      this.colorMillOutputType &&
      this.colorMillOutputType !== resultType
    ) {
      this.showColorMillNotice(
        '완성된 떡을 먼저 가져간 뒤 다른 재료를 넣어주세요.',
      );
      return;
    }

    this.colorMillCrafting = true;
    this.colorMillCraftStartAt = this.time.now;
    this.colorMillCraftEndAt =
      this.time.now + this.colorMillCraftDuration;

    this.updateColorMillMachineSlots();
  }

  handleColorMillOutputClick() {
    if (this.heldInventoryItem) {
      this.showColorMillNotice(
        '현재 들고 있는 아이템을 먼저 내려놓으세요.',
      );
      return;
    }

    if (this.colorMillOutputCount <= 0) {
      if (this.colorMillCrafting) {
        this.showColorMillNotice('아직 떡을 만드는 중입니다.');
      } else {
        this.showColorMillNotice('완성된 떡이 없습니다.');
      }

      return;
    }

    const collectedCount = this.colorMillOutputCount;
    const collectedType = this.colorMillOutputType;

    this.addItemToInventory(collectedType, collectedCount);

    this.colorMillOutputCount = 0;
    this.colorMillOutputType = null;

    this.updateInventoryHUD();
    this.updateColorMillMachineSlots();

    const collectedItem = this.getInventoryItemData({
      type: collectedType,
      count: 1,
    });

    this.showColorMillNotice(
      `${collectedItem.name} ${collectedCount}개를 인벤토리에 넣었습니다.`,
    );
  }

  updateColorMillCraft() {
    if (!this.colorMillCrafting) {
      if (
        this.colorMillInputBasicCount > 0 &&
        this.colorMillInputMaterialCount > 0
      ) {
        this.startNextColorMillCraft();
      }

      return;
    }

    const remaining =
      this.colorMillCraftEndAt - this.time.now;

    if (remaining > 0) {
      this.updateColorMillMachineSlots();
      return;
    }

    this.colorMillCrafting = false;

    // 제작 도중 재료를 도로 꺼내서 부족해졌다면 완성 없이 취소
    if (
      this.colorMillInputBasicCount <= 0 ||
      this.colorMillInputMaterialCount <= 0 ||
      !this.colorMillInputMaterialType
    ) {
      if (this.colorMillInputBasicCount <= 0) {
        this.colorMillInputBasicCount = 0;
      }

      if (this.colorMillInputMaterialCount <= 0) {
        this.colorMillInputMaterialCount = 0;
        this.colorMillInputMaterialType = null;
      }

      this.updateColorMillMachineSlots();
      return;
    }

    this.colorMillInputBasicCount -= 1;
    this.colorMillInputMaterialCount -= 1;

    const resultType =
      this.materialToTteok[this.colorMillInputMaterialType];

    this.colorMillOutputType = resultType;
    this.colorMillOutputCount += 1;

    if (this.colorMillInputMaterialCount <= 0) {
      this.colorMillInputMaterialCount = 0;
      this.colorMillInputMaterialType = null;
    }

    if (this.colorMillInputBasicCount <= 0) {
      this.colorMillInputBasicCount = 0;
    }

    this.updateColorMillMachineSlots();

    if (this.millOpen) {
      const resultItem = this.getInventoryItemData({
        type: resultType,
        count: 1,
      });

      this.showColorMillNotice(
        `${resultItem.name} 1개가 완성되었습니다!`,
      );
    }

    if (
      this.colorMillInputBasicCount > 0 &&
      this.colorMillInputMaterialCount > 0
    ) {
      this.startNextColorMillCraft();
    }
  }

  updateColorMillMachineSlots() {
    if (!this.colorMillInputBasicIcon) {
      return;
    }

    if (this.colorMillInputBasicCount > 0) {
      this.setSlotIconDisplay(
        this.colorMillInputBasicIcon,
        this.colorMillInputBasicImage,
        'ricecake',
        64,
      );

      this.colorMillInputBasicCountText.setText(
        `x${this.colorMillInputBasicCount}`,
      );
    } else {
      this.colorMillInputBasicIcon.clear();
      this.colorMillInputBasicImage.setVisible(false);
      this.colorMillInputBasicCountText.setText('');
    }

    if (
      this.colorMillInputMaterialType &&
      this.colorMillInputMaterialCount > 0
    ) {
      this.setSlotIconDisplay(
        this.colorMillInputMaterialIcon,
        this.colorMillInputMaterialImage,
        this.colorMillInputMaterialType,
        64,
      );

      this.colorMillInputMaterialCountText.setText(
        `x${this.colorMillInputMaterialCount}`,
      );
    } else {
      this.colorMillInputMaterialIcon.clear();
      this.colorMillInputMaterialImage.setVisible(false);
      this.colorMillInputMaterialCountText.setText('');
    }

    if (this.colorMillOutputCount > 0 && this.colorMillOutputType) {
      this.setSlotIconDisplay(
        this.colorMillOutputIcon,
        this.colorMillOutputImage,
        this.colorMillOutputType,
      );

      this.colorMillOutputCountText.setText(
        `x${this.colorMillOutputCount}`,
      );
    } else {
      this.colorMillOutputIcon.clear();
      this.colorMillOutputImage.setVisible(false);
      this.colorMillOutputCountText.setText('');
    }

    if (this.colorMillCrafting) {
      const elapsed = this.time.now - this.colorMillCraftStartAt;

      const progress = Phaser.Math.Clamp(
        elapsed / this.colorMillCraftDuration,
        0,
        1,
      );

      const remainingSeconds = Math.max(
        1,
        Math.ceil(
          (this.colorMillCraftEndAt - this.time.now) / 1000,
        ),
      );

      this.colorMillProgressFill.setScale(progress, 1);

      this.colorMillProgressText.setText(
        `색깔 떡 제작 중 · ${remainingSeconds}초 남음`,
      );

      return;
    }

    this.colorMillProgressFill.setScale(0, 1);

    if (this.colorMillOutputCount > 0) {
      this.colorMillProgressText.setText(
        '완성된 떡을 클릭해서 가져가세요.',
      );
    } else {
      this.colorMillProgressText.setText(
        '기본 떡과 재료를 넣으면 제작이 시작됩니다.',
      );
    }
  }


  updateInventoryPanel() {
    this.renderInventorySlots(this.inventorySlots, this.inventoryData, 'inventory');
    this.renderInventorySlots(this.millInventorySlots, this.inventoryData, 'inventory');

    if (this.hotbarSlots) {
      this.renderInventorySlots(this.hotbarSlots, this.inventoryData, 'inventory');
    }

    if (this.fridgeInventorySlots) {
      this.renderInventorySlots(
        this.fridgeInventorySlots,
        this.inventoryData,
        'inventory',
      );
    }

    if (this.fridgeSlots) {
      this.renderInventorySlots(this.fridgeSlots, this.fridgeData, 'fridge');
    }

    if (this.fridgeCapacityText) {
      this.updateFridgeCapacityText();
    }
  }

  renderInventorySlots(slotList, dataArray, dataSource) {
    if (!slotList || slotList.length === 0) {
      return;
    }

    for (let i = 0; i < slotList.length; i += 1) {
      const slot = slotList[i];
      const stack = dataArray[i];
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
        this.heldItemSourceSlot.index === i &&
        (this.heldItemSourceSlot.dataSource || 'inventory') ===
          (dataSource || 'inventory');

      slot.icon.setAlpha(isHeldSource ? 0.2 : 1);
      slot.countText.setAlpha(isHeldSource ? 0.2 : 1);

      if (!item) {
        continue;
      }

      if (item.imageKey && slot.itemImage) {
        const size = slot.imageSize || 60;

        slot.itemImage
          .setTexture(item.imageKey)
          .setDisplaySize(size, size)
          .setVisible(true);
      } else {
        this.drawInventoryIcon(slot.icon, item.type);
      }

      slot.countText.setText(`x${item.count}`);
    }
  }

  

  
  // 그래픽 전용 슬롯(떡방앗간/오색방앗간)에서 실제 사진이 있으면 사진을,
  // 없으면 기존처럼 도형 아이콘을 보여줌
  setSlotIconDisplay(iconGraphics, iconImage, type, size = 72) {
    const itemData = this.getInventoryItemData({
      type,
      count: 1,
    });

    iconGraphics.clear();

    if (iconImage) {
      iconImage.setVisible(false);
    }

    if (!itemData) {
      return;
    }

    if (itemData.imageKey && iconImage) {
      iconImage
        .setTexture(itemData.imageKey)
        .setDisplaySize(size, size)
        .setVisible(true);
    } else {
      this.drawInventoryIcon(iconGraphics, type);
    }
  }

  drawInventoryIcon(graphics, type) {
    graphics.clear();

    if (type.startsWith('spoiled_')) {
      // 상한 떡: 회색 떡 위에 X 표시
      graphics.fillStyle(0x8a8a86);
      graphics.fillRoundedRect(-18, 4, 36, 10, 4);

      graphics.fillStyle(0xb9b6ab);
      graphics.fillCircle(0, -2, 18);

      graphics.lineStyle(3, 0x6b1d1d);
      graphics.beginPath();
      graphics.moveTo(-10, -12);
      graphics.lineTo(10, 8);
      graphics.moveTo(10, -12);
      graphics.lineTo(-10, 8);
      graphics.strokePath();
      return;
    }

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
      return;
    }

    if (type === 'axe') {
      // 도끼 (임시 아이콘)
      graphics.lineStyle(4, 0x8d6e63);
      graphics.beginPath();
      graphics.moveTo(-6, 18);
      graphics.lineTo(10, -18);
      graphics.strokePath();

      graphics.fillStyle(0xb0b8c1);
      graphics.fillTriangle(4, -20, 22, -6, 6, 4);

      graphics.lineStyle(2, 0x6b7280);
      graphics.strokeTriangle(4, -20, 22, -6, 6, 4);
      return;
    }

    if (type === 'fishing_rod') {
      // 낚싯대 (임시 아이콘)
      graphics.lineStyle(3, 0x8d6e63);
      graphics.beginPath();
      graphics.moveTo(-16, 18);
      graphics.lineTo(16, -18);
      graphics.strokePath();

      graphics.lineStyle(1, 0xd1d5db);
      graphics.beginPath();
      graphics.moveTo(16, -18);
      graphics.lineTo(10, 14);
      graphics.strokePath();

      graphics.fillStyle(0xf4d35e);
      graphics.fillCircle(10, 14, 3);
      return;
    }

    if (type === 'pickaxe') {
      // 곡괭이 (임시 아이콘)
      graphics.lineStyle(4, 0x8d6e63);
      graphics.beginPath();
      graphics.moveTo(0, 20);
      graphics.lineTo(0, -8);
      graphics.strokePath();

      graphics.lineStyle(4, 0x9ca3af);
      graphics.beginPath();
      graphics.moveTo(-18, -14);
      graphics.lineTo(0, -8);
      graphics.lineTo(18, -14);
      graphics.strokePath();
      return;
    }

    if (type === 'bow') {
      // 활 (임시 아이콘)
      graphics.lineStyle(3, 0x8d6e63);
      graphics.beginPath();
      graphics.arc(-6, 0, 20, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70));
      graphics.strokePath();

      graphics.lineStyle(1, 0xe5e7eb);
      graphics.beginPath();
      graphics.moveTo(1, -19);
      graphics.lineTo(1, 19);
      graphics.strokePath();
      return;
    }

    if (type === 'lantern') {
      // 랜턴 (임시 아이콘)
      graphics.fillStyle(0xfde68a);
      graphics.fillRoundedRect(-10, -8, 20, 24, 4);

      graphics.lineStyle(2, 0x6b7280);
      graphics.strokeRoundedRect(-10, -8, 20, 24, 4);

      graphics.lineStyle(3, 0x6b7280);
      graphics.beginPath();
      graphics.moveTo(-6, -8);
      graphics.lineTo(-6, -18);
      graphics.lineTo(6, -18);
      graphics.lineTo(6, -8);
      graphics.strokePath();
      return;
    }

    if (type === 'rusty_lock' || type === 'steel_lock') {
      // 자물쇠 (임시 아이콘)
      const bodyColor = type === 'steel_lock' ? 0xcbd5e1 : 0xb45309;

      graphics.lineStyle(4, bodyColor);
      graphics.beginPath();
      graphics.arc(0, -4, 10, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360));
      graphics.strokePath();

      graphics.fillStyle(bodyColor);
      graphics.fillRoundedRect(-14, -4, 28, 22, 4);

      graphics.lineStyle(2, 0x374151);
      graphics.strokeRoundedRect(-14, -4, 28, 22, 4);

      graphics.fillStyle(0x374151);
      graphics.fillCircle(0, 7, 3);
      return;
    }

    if (type.startsWith('fridge_upgrade')) {
      // 냉장고 업그레이드 (임시 아이콘, 미니 냉장고)
      graphics.fillStyle(0xbfe0f0);
      graphics.fillRoundedRect(-14, -22, 28, 44, 5);

      graphics.lineStyle(2, 0x2b3a4a);
      graphics.strokeRoundedRect(-14, -22, 28, 44, 5);

      graphics.lineStyle(2, 0x2b3a4a);
      graphics.beginPath();
      graphics.moveTo(-12, -5);
      graphics.lineTo(12, -5);
      graphics.strokePath();

      graphics.fillStyle(0x9aa5ad);
      graphics.fillRoundedRect(-10, -17, 3, 8, 1);
      graphics.fillRoundedRect(-10, 1, 3, 10, 1);
      return;
    }

    if (type === 'slime') {
      // 슬라임 (임시 아이콘)
      graphics.fillStyle(0x4ade80, 0.9);
      graphics.fillEllipse(0, 4, 32, 24);

      graphics.lineStyle(2, 0x16a34a);
      graphics.strokeEllipse(0, 4, 32, 24);

      graphics.fillStyle(0xbbf7d0);
      graphics.fillCircle(-7, -2, 4);
      graphics.fillCircle(6, 2, 3);
      return;
    }

    if (type === 'gold_powder') {
      // 금가루 (임시 아이콘)
      graphics.fillStyle(0xf4c95d);
      graphics.fillCircle(-8, 4, 4);
      graphics.fillCircle(4, -6, 5);
      graphics.fillCircle(9, 6, 3);
      graphics.fillCircle(-2, 8, 3);

      graphics.lineStyle(1, 0xb8860b);
      graphics.strokeCircle(-8, 4, 4);
      graphics.strokeCircle(4, -6, 5);
      return;
    }

    if (type === 'wood') {
      // 목재 (임시 아이콘)
      graphics.fillStyle(0x8d6e63);
      graphics.fillRoundedRect(-18, -8, 36, 16, 6);

      graphics.lineStyle(2, 0x5d4037);
      graphics.strokeRoundedRect(-18, -8, 36, 16, 6);

      graphics.lineStyle(2, 0xd7bd8a);
      graphics.strokeCircle(-18, 0, 6);
      graphics.strokeCircle(18, 0, 6);
      return;
    }

    if (type === 'fish') {
      // 물고기 (임시 아이콘)
      graphics.fillStyle(0x60a5fa);
      graphics.fillEllipse(-2, 0, 30, 16);

      graphics.fillTriangle(14, 0, 24, -10, 24, 10);

      graphics.fillStyle(0xffffff);
      graphics.fillCircle(-10, -3, 2.5);
      return;
    }

    if (type === 'meat') {
      // 고기 (임시 아이콘)
      graphics.fillStyle(0xb45309);
      graphics.fillCircle(-2, -2, 14);

      graphics.fillStyle(0xe5e7eb);
      graphics.fillRoundedRect(-2, 6, 6, 16, 3);
      return;
    }

    if (type === 'legendary_material') {
      // 전설 재료 (임시 아이콘, 반짝이는 별)
      graphics.fillStyle(0xf4d35e);
      graphics.fillCircle(0, 0, 14);

      graphics.lineStyle(2, 0xffffff);
      graphics.beginPath();
      graphics.moveTo(-16, 0);
      graphics.lineTo(16, 0);
      graphics.moveTo(0, -16);
      graphics.lineTo(0, 16);
      graphics.strokePath();
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
    // 인벤토리, 떡방앗간, 냉장고가 열려 있을 때만 작동
    if (!this.inventoryOpen && !this.millOpen && !this.fridgeOpen) {
      return;
    }

    if (this.heldInventoryItem) {
      return;
    }

    const sourceArray = this.getSlotDataArray(slot.dataSource);
    const stack = sourceArray[slot.index];
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
      dataSource: slot.dataSource || 'inventory',
    };

    this.heldItemIcon.clear();
    this.heldItemImage.setVisible(false);

    if (item.imageKey) {
      this.heldItemImage
        .setTexture(item.imageKey)
        .setDisplaySize(66, 66)
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
  checkRoomTransition() {
    if (this.roomTransitioning || this.inHouse || this.inFarm) {
      return;
    }

    const roomLeft = (this.currentRoom.col - 1) * this.SCREEN_W;
    const roomRight = roomLeft + this.SCREEN_W;
    const roomTop = (this.currentRoom.row - 1) * this.SCREEN_H;
    const roomBottom = roomTop + this.SCREEN_H;

    let nextCol = this.currentRoom.col;
    let nextRow = this.currentRoom.row;

    if (this.player.x > roomRight - 10 && nextCol < this.WORLD_COLS) nextCol += 1;
    else if (this.player.x < roomLeft + 10 && nextCol > 1) nextCol -= 1;

    if (this.player.y > roomBottom - 10 && nextRow < this.WORLD_ROWS) nextRow += 1;
    else if (this.player.y < roomTop + 10 && nextRow > 1) nextRow -= 1;

    if (nextCol !== this.currentRoom.col || nextRow !== this.currentRoom.row) {
      this.transitionToRoom(nextCol, nextRow);
    }
  }

  transitionToRoom(col, row) {
    this.currentRoom = { col, row };
    this.roomTransitioning = true;
    this.player.body.setVelocity(0);

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: (col - 1) * this.SCREEN_W,
      scrollY: (row - 1) * this.SCREEN_H,
      duration: 500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.roomTransitioning = false;
      },
    });
  }



  // 목표 칸이 냉장고일 때: 떡 종류만 허용하고, 남은 용량을 넘는 수량은 거부
  checkFridgeDeposit(sourceStack, amount) {
    if (!this.riceCakeTypes.includes(sourceStack.type)) {
      this.showFridgeNotice('냉장고에는 떡만 넣을 수 있습니다.');
      return false;
    }

    const remaining = this.getFridgeCapacity() - this.getFridgeTotalCount();

    if (amount > remaining) {
      this.showFridgeNotice(
        remaining > 0
          ? `냉장고에 자리가 부족합니다 (남은 자리 ${remaining}개).`
          : '냉장고가 가득 찼습니다.',
      );
      return false;
    }

    return true;
  }

  placeWholeHeldItem(targetIndex, targetDataSource = 'inventory') {
    if (
      !this.heldInventoryItem ||
      !this.heldItemSourceSlot
    ) {
      return;
    }

    const sourceDataSource =
      this.heldItemSourceSlot.dataSource || 'inventory';
    const sourceIndex = this.heldItemSourceSlot.index;
    const sourceArray = this.getSlotDataArray(sourceDataSource);
    const targetArray = this.getSlotDataArray(targetDataSource);

    // 원래 칸을 클릭하면 그냥 내려놓기
    if (
      sourceDataSource === targetDataSource &&
      sourceIndex === targetIndex
    ) {
      this.releaseHeldInventoryItem();
      return;
    }

    const sourceStack = sourceArray[sourceIndex];

    if (!sourceStack) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    if (
      targetDataSource === 'fridge' &&
      !this.checkFridgeDeposit(sourceStack, sourceStack.count)
    ) {
      return;
    }

    const targetStack = targetArray[targetIndex];

    // 빈칸으로 전체 이동
    if (!targetStack) {
      targetArray[targetIndex] = sourceStack;
      sourceArray[sourceIndex] = null;

      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 같은 아이템이면 합치기
    if (targetStack.type === sourceStack.type) {
      targetStack.count += sourceStack.count;
      sourceArray[sourceIndex] = null;

      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    // 다른 아이템이면 서로 교환 (냉장고 칸과 교환할 때도 대상 칸의 떡이 인벤토리로 나가는 것뿐이라 허용)
    targetArray[targetIndex] = sourceStack;
    sourceArray[sourceIndex] = targetStack;

    this.clearHeldInventoryItem();
    this.updateInventoryPanel();
  }

  placeOneHeldItem(targetIndex, targetDataSource = 'inventory') {
    if (
      !this.heldInventoryItem ||
      !this.heldItemSourceSlot
    ) {
      return;
    }

    const sourceDataSource =
      this.heldItemSourceSlot.dataSource || 'inventory';
    const sourceIndex = this.heldItemSourceSlot.index;

    // 원래 슬롯에는 우클릭으로 놓지 않음
    if (
      sourceDataSource === targetDataSource &&
      sourceIndex === targetIndex
    ) {
      return;
    }

    const sourceArray = this.getSlotDataArray(sourceDataSource);
    const targetArray = this.getSlotDataArray(targetDataSource);
    const sourceStack = sourceArray[sourceIndex];
    const targetStack = targetArray[targetIndex];

    if (!sourceStack || sourceStack.count <= 0) {
      this.clearHeldInventoryItem();
      this.updateInventoryPanel();
      return;
    }

    if (
      targetDataSource === 'fridge' &&
      !this.checkFridgeDeposit(sourceStack, 1)
    ) {
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
      } else if (this.fridgeOpen) {
        this.showFridgeNotice(
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
      targetArray[targetIndex] = {
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
      sourceArray[sourceIndex] = null;
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

    const targetDataSource = slot.dataSource || 'inventory';

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
      this.placeOneHeldItem(slot.index, targetDataSource);
      return;
    }

    // 좌클릭: 전체 묶음 놓기 또는 교환
    if (pointer.button === 0) {
      this.placeWholeHeldItem(slot.index, targetDataSource);
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

    // 냉장고에 넣지 않아 상한 떡: 판매 불가, 버리는 것만 가능
    if (stack.type.startsWith('spoiled_')) {
      return {
        type: stack.type,
        count: stack.count,
        name: '상한 떡',
        description: '냉장고에 넣지 않아 상했습니다. 판매할 수 없으니 버려야 합니다.',
        imageKey: null,
      };
    }

    const definitions = {
      seed: {
        name: '씨앗',
        description: '농장에 심으면 밀이 자랍니다.',
        imageKey: 'ingredient_seed',
      },

      wheat: {
        name: '밀',
        description: '기본 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_wheat',
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

      axe: {
        name: '도끼',
        description: '벌목에 사용하는 기본 도구입니다.',
        imageKey: null,
      },

      fishing_rod: {
        name: '낚싯대',
        description: '낚시에 사용하는 기본 도구입니다.',
        imageKey: null,
      },

      pickaxe: {
        name: '곡괭이',
        description: '채광에 사용하는 기본 도구입니다.',
        imageKey: null,
      },

      bow: {
        name: '활',
        description: '수렵에 사용하는 기본 도구입니다.',
        imageKey: null,
      },

      lantern: {
        name: '랜턴',
        description: '던전 탐험에 사용하는 기본 도구입니다.',
        imageKey: null,
      },

      rusty_lock: {
        name: '녹슨 자물쇠',
        description: '설치한 당일 밤에만 효과가 있습니다.',
        imageKey: null,
      },

      steel_lock: {
        name: '강철 자물쇠',
        description: '늑대가 찾아올 때까지 계속 유지됩니다.',
        imageKey: null,
      },

      slime: {
        name: '슬라임',
        description: '오색방앗간에서 초록 달 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_green',
      },

      gold_powder: {
        name: '금가루',
        description: '오색방앗간에서 노랑 달 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_yellow',
      },

      wood: {
        name: '목재',
        description: '오색방앗간에서 갈색 달 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_brown',
      },

      fish: {
        name: '물고기',
        description: '오색방앗간에서 파랑 달 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_blue',
      },

      meat: {
        name: '고기',
        description: '오색방앗간에서 빨강 달 떡을 만드는 재료입니다.',
        imageKey: 'ingredient_red',
      },

      legendary_material: {
        name: '전설 재료',
        description: '오색방앗간에서 빛나는 떡을 만드는 귀한 재료입니다.',
        imageKey: 'ingredient_shining',
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

    this.hideItemTooltip();

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
    if (this.inventoryText) {
      this.inventoryText.setText(
        `씨앗 ${this.seedCount} | 밀 ${this.wheatCount} | 떡 ${this.basicRiceCakeCount}`,
      );
    }

    // 슬롯 그리드(인벤토리/방앗간/냉장고/핫바)도 항상 같이 갱신
    this.updateInventoryPanel();
  }

  update(time, delta) {
    // SPACE(상호작용 키)의 눌림/떼임을 이번 프레임 기준으로 한 번만 계산
    // (Phaser.Input.Keyboard.JustDown/JustUp을 여러 곳에서 호출하면
    //  먼저 호출한 쪽이 값을 소비해버려서 나중 호출이 false가 되는 문제가 있어 직접 계산함)
    const interactIsDown = this.keys.interact.isDown;
    this.interactJustPressed = interactIsDown && !this.previousInteractIsDown;
    this.interactJustReleased = !interactIsDown && this.previousInteractIsDown;
    this.previousInteractIsDown = interactIsDown;


    this.movePlayer();
    this.updatePlayerParts();
    this.updatePlayerAnimation(delta); // 추가


    // 인벤토리나 떡방앗간이 열려 있어도
    // 농작물과 떡 제작 시간은 계속 흐름
    this.updateFarmGrowth();
    this.updateRiceCakeMill();
    this.updateColorMillCraft();

    // 하루 시간과 시계 바늘 진행
    this.updateDayClock();
 
    if (this.inHouse) {
      this.checkNearbyHouseArea();
    } else if (this.inFarm) {
      this.checkNearbyFarmArea();
    } else {
      this.checkNearbyArea();
      this.checkMapBoundaryNotice();
    }
    
    // 잠자는 동안에는 일반 이동과 상호작용을 중지
    if (this.isSleeping) {
      this.updateSleeping();
      return;
    }

    // 하루일지(영수증)를 보는 동안에도 이동과 상호작용을 중지
    if (this.journalOpen) {
      this.player.body.setVelocity(0);
      return;
    }

    // -------------------------------------------------
    // ESC 키로 현재 열려 있는 창 닫기
    // -------------------------------------------------
    if (
      Phaser.Input.Keyboard.JustDown(
        this.keys.close,
      )
    ) {
      if (this.shopQuantityOpen) {
        this.cancelShopQuantitySelector();
        return;
      }

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

      // 냉장고가 열려 있으면 냉장고 닫기
      if (this.fridgeOpen) {
        this.closeFridgePanel();
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
      if (this.shopQuantityOpen) {
        this.cancelShopQuantitySelector();
        return;
      }

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

      // 냉장고가 열려 있으면 냉장고 닫기
      if (this.fridgeOpen) {
        this.closeFridgePanel();
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
      this.fridgeOpen ||
      this.shopOpen ||
      this.discardConfirmOpen ||
      this.shopConfirmOpen ||
      this.shopQuantityOpen
    ) {
      this.player.body.setVelocity(0);
      this.interactionText.setVisible(false);
      return;
    }

    // 아무 창도 열려 있지 않을 때만 움직임
    this.movePlayer();
    this.updatePlayerParts();

  }

  movePlayer() {
    const body = this.player.body;
    body.setVelocity(0);

    const moveLeft = this.keys.left.isDown || this.cursors.left.isDown;
    const moveRight = this.keys.right.isDown || this.cursors.right.isDown;
    const moveUp = this.keys.up.isDown || this.cursors.up.isDown;
    const moveDown = this.keys.down.isDown || this.cursors.down.isDown;

    if (moveLeft) {
      body.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
    } else if (moveRight) {
      body.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
    }

    if (moveUp) {
      body.setVelocityY(-this.playerSpeed);
    } else if (moveDown) {
      body.setVelocityY(this.playerSpeed);
    }

    body.velocity.normalize().scale(this.playerSpeed);

    this.isMoving = moveLeft || moveRight || moveUp || moveDown;
  }


  updatePlayerAnimation(delta) {
    if (!this.isMoving) {
      this.player.setTexture('player_idle');
      this.walkAnimTimer = 0;
      return;
    }

    this.walkAnimTimer += delta;

    if (this.walkAnimTimer >= this.walkAnimInterval) {
      this.walkAnimTimer = 0;
      this.walkFrameToggle = !this.walkFrameToggle;

      this.player.setTexture(
        this.walkFrameToggle ? 'player_walk' : 'player_walk2',
      );
    }
  }

  updatePlayerParts() {
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
  checkMapBoundaryNotice() {
    // 실내에서는 표시하지 않음
    if (this.inHouse || this.inFarm) {
      return;
    }

    // 농장 / 집 / 상점 / 방앗간 안내가 뜨고 있다면
    // 그 안내를 우선함
    if (this.currentArea) {
      return;
    }

    const body = this.player.body;
    const margin = 35;

    const nearEdge =
      body.left <= margin ||
      body.right >= this.SCREEN_W - margin ||
      body.top <= margin ||
      body.bottom >= this.SCREEN_H - margin;

    if (nearEdge) {
      this.interactionText
        .setText('🚧 이 지역은 준비 중입니다')
        .setVisible(true);
    }
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

    if (nearbyArea.name === '농장') {
      this.interactionText
        .setText('[SPACE] 농장 들어가기')
        .setVisible(true);

      if (this.interactJustPressed) {
        this.enterFarm();
      }

      return;
    }


    // 방앗간 상호작용
    if (nearbyArea.name === '방앗간') {
      this.interactionText
        .setText('[SPACE] 방앗간 열기')
        .setVisible(true);

      if (this.interactJustPressed) {
        this.openRiceCakeMill();
      }

      return;
    }

    if (nearbyArea.name === '상점') {
      this.interactionText
        .setText('[SPACE] 상점 열기')
        .setVisible(true);

      if (this.interactJustPressed) {
        this.openShop();
      }

      return;
    }

    // 집 상호작용 (포탈처럼 실내로 진입)
    if (nearbyArea.name === '달토끼의 집') {
      this.interactionText
        .setText('[SPACE] 집 들어가기')
        .setVisible(true);

      if (this.interactJustPressed) {
        this.enterHouse();
      }

      return;
    }

    // 상점 등 아직 개발하지 않은 장소
    this.interactionText
      .setText(`[SPACE] ${nearbyArea.name} 이용하기`)
      .setVisible(true);

    if (this.interactJustPressed) {
      this.showAreaMessage(nearbyArea);
    }
  }

  // -------------------------------------------------------------------------
  // 집 내부 (포탈 진입/퇴장)
  // -------------------------------------------------------------------------

  enterHouse() {
    if (this.inHouse) {
      return;
    }

    this.inHouse = true;

    this.outdoorContainer.setVisible(false);
    this.houseInteriorContainer.setVisible(true);

    this.currentArea = null;
    this.nearestFarmPlot = null;
    this.updateFarmPlotHighlight(null);

    this.currentHouseArea = null;
    this.carriedFurniture = null;

    // 집에 들어올 때 사용한 SPACE가
    // 침대 들어 올리기로 이어지지 않게 처리
    this.spaceKeyDownAt = null;
    this.spaceHoldFired = true;

    this.interactionMessageActive = false;
    this.interactionText.setVisible(false);

    this.player.setPosition(
      this.houseEnterSpawn.x,
      this.houseEnterSpawn.y,
    );

    this.player.body.setVelocity(0);
  }

  exitHouse() {
    if (!this.inHouse) {
      return;
    }

    this.inHouse = false;

    this.houseInteriorContainer.setVisible(false);
    this.outdoorContainer.setVisible(true);

    this.currentHouseArea = null;
    this.carriedFurniture = null;
    this.spaceKeyDownAt = null;
    this.spaceHoldFired = true;
    this.interactionMessageActive = false;
    this.interactionText.setVisible(false);

    this.player.setPosition(
      this.houseExitSpawn.x,
      this.houseExitSpawn.y,
    );

    this.player.body.setVelocity(0);
  }

  enterFarm() {
    if (this.inFarm) {
      return;
    }

    this.inFarm = true;

    this.outdoorContainer.setVisible(false);
    this.farmInteriorContainer.setVisible(true);

    this.currentArea = null;
    this.nearestFarmPlot = null;

    this.interactionMessageActive = false;
    this.interactionText.setVisible(false);

    this.player.setPosition(this.farmEnterSpawn.x, this.farmEnterSpawn.y);
    this.player.body.setVelocity(0);
  }

  exitFarm() {
    if (!this.inFarm) {
      return;
    }

    this.inFarm = false;

    this.farmInteriorContainer.setVisible(false);
    this.outdoorContainer.setVisible(true);

    this.nearestFarmPlot = null;
    this.interactionMessageActive = false;
    this.interactionText.setVisible(false);

    this.player.setPosition(this.farmExitSpawn.x, this.farmExitSpawn.y);
    this.player.body.setVelocity(0);
  }

  checkNearbyFarmArea() {
    const doorDistance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.farmDoorX, this.farmDoorY,
    );

    if (doorDistance < 90) {
      this.nearestFarmPlot = null;
      this.updateFarmPlotHighlight(null);

      this.interactionText.setText('[SPACE] 밖으로 나가기').setVisible(true);

      if (this.interactJustPressed) {
        this.exitFarm();
      }
      return;
    }

    this.nearestFarmPlot = this.findNearestFarmPlot();
    this.updateFarmPlotHighlight(this.nearestFarmPlot);

    this.interactionText
      .setText(this.getFarmPrompt(this.nearestFarmPlot))
      .setVisible(true);

    if (this.interactJustPressed) {
      this.handleFarmInteraction(this.nearestFarmPlot);
    }
  }
  
  checkNearbyHouseArea() {
    // 스페이스를 새로 누른 순간 처리
    if (this.interactJustPressed) {
      // 가구를 들고 있다면 이번 SPACE는 내려놓기에만 사용
      if (this.carriedFurniture) {
        this.dropCarriedFurniture();

        // 같은 SPACE 입력으로 다시 들어 올리지 않게 막기
        this.spaceKeyDownAt = null;
        this.spaceHoldFired = true;

        return;
      }

      // 집 안에서 새로 누른 SPACE만 시간 측정
      this.spaceKeyDownAt = this.time.now;
      this.spaceHoldFired = false;
    }

    // 가구를 들고 있는 동안: 가구가 플레이어를 계속 따라다님 (키를 떼고 있어도 유지됨)
    if (this.carriedFurniture) {
      this.carriedFurniture.container.setPosition(
        this.player.x,
        this.player.y - 10,
      );

      this.interactionText
        .setText(`${this.carriedFurniture.name}을(를) 들고 있어요 · SPACE를 누르면 내려놓기`)
        .setVisible(true);

      return;
    }

    let nearbyArea = null;

    for (const area of this.houseAreas) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        area.object.x,
        area.object.y,
      );

      if (distance < 140) {
        nearbyArea = area;
        break;
      }
    }

    this.currentHouseArea = nearbyArea;

    // 근처에 가구가 있고, 스페이스를 일정 시간 이상 누르고 있으면 들어올리기
    if (
      nearbyArea &&
      nearbyArea.furniture &&
      this.keys.interact.isDown &&
      this.spaceKeyDownAt !== null &&
      !this.spaceHoldFired &&
      this.time.now - this.spaceKeyDownAt >= this.spaceHoldDuration
    ) { 
      this.spaceHoldFired = true;
      this.pickUpFurniture(nearbyArea);
      return;
    }

    if (!nearbyArea) {
      this.interactionMessageActive = false;
      this.interactionText.setVisible(false);
      return;
    }

    if (this.interactionMessageActive) {
      return;
    }

    // 짧게 눌렀다 뗀 경우에만 탭 상호작용 실행 (꾹 누르기는 위에서 이미 처리됨)
    const tapped =
      this.interactJustReleased &&
      !this.spaceHoldFired;

    if (nearbyArea.name === '문') {
      this.interactionText
        .setText('[SPACE] 밖으로 나가기')
        .setVisible(true);

      if (tapped) {
        this.exitHouse();
      }

      return;
    }

    if (nearbyArea.name === '냉장고') {
      this.interactionText
        .setText('[SPACE] 냉장고 열기 · 꾹 누르면 들어서 옮기기')
        .setVisible(true);

      if (tapped) {
        this.openFridgePanel();
      }

      return;
    }

    if (nearbyArea.name === '침대') {
      this.interactionText
        .setText(
          '[SPACE] 잠자기 · 5초 동안 움직이지 않기\n꾹 누르면 들어서 옮기기',
        )
        .setVisible(true);

      if (tapped) {
        this.startSleeping();
      }

      return;
    }

    // 창고 등 아직 개발 전인 가구
    this.interactionText
      .setText(`[SPACE] ${nearbyArea.name} 이용하기 · 꾹 누르면 들어서 옮기기`)
      .setVisible(true);

    if (tapped) {
      this.showHouseAreaMessage(nearbyArea);
    }
  }

  pickUpFurniture(areaEntry) {
    this.carriedFurniture = areaEntry;
    this.currentHouseArea = null;
    this.interactionMessageActive = false;
  }

  dropCarriedFurniture() {
    if (!this.carriedFurniture) {
      return;
    }

    this.carriedFurniture = null;

    // 내려놓을 때 누른 SPACE가
    // 다시 가구 들어 올리기로 이어지지 않게 처리
    this.spaceKeyDownAt = null;
    this.spaceHoldFired = true;

    this.interactionText.setVisible(false);
  }

  // -------------------------------------------------------------------------
  // 침대: 잠을 자고 다음 날로 넘어감 (냉장고에 없는 떡은 모두 상함)
  // -------------------------------------------------------------------------

  startSleeping() {
    if (this.isSleeping) {
      return;
    }

    // 가구를 들고 있다면 잠들 수 없음
    if (this.carriedFurniture) {
      return;
    }

    this.isSleeping = true;
    this.sleepFinishing = false;
    this.sleepForced = false;
    this.sleepStartedAt = this.time.now;

    this.player.body.setVelocity(0);

    this.interactionMessageActive = true;
    this.interactionText.setVisible(false);

    this.sleepDarkOverlay
      .setVisible(true)
      .setAlpha(0);

    this.sleepUiContainer.setVisible(true);

    this.sleepProgressFill.setScale(0, 1);
    this.sleepStatusText.setText('5초 남음');
  }

  // 23시(하루 끝)가 되면 위치나 상태와 상관없이 자동으로 잠듦.
  // 침대 없이도 발생하고, 움직여도 취소되지 않음
  triggerForcedSleep() {
    if (this.isSleeping) {
      return;
    }

    // 열려 있는 창이 있다면 전부 닫음
    if (this.heldInventoryItem) {
      this.releaseHeldInventoryItem();
    }

    if (this.shopQuantityOpen) {
      this.cancelShopQuantitySelector();
    }

    if (this.shopConfirmOpen) {
      this.cancelShopTransaction();
    }

    if (this.discardConfirmOpen) {
      this.cancelDiscardConfirmation();
    }

    if (this.shopOpen) {
      this.closeShop();
    }

    if (this.millOpen) {
      this.closeRiceCakeMill();
    }

    if (this.fridgeOpen) {
      this.closeFridgePanel();
    }

    if (this.inventoryOpen) {
      this.toggleInventory();
    }

    // 가구를 들고 있었다면 그 자리에 내려놓음
    if (this.carriedFurniture) {
      this.dropCarriedFurniture();
    }

    this.isSleeping = true;
    this.sleepFinishing = false;
    this.sleepForced = true;
    this.sleepStartedAt = this.time.now;

    this.player.body.setVelocity(0);

    this.interactionMessageActive = true;
    this.interactionText.setVisible(false);

    this.sleepDarkOverlay
      .setVisible(true)
      .setAlpha(0);

    this.sleepUiContainer.setVisible(true);

    this.sleepProgressFill.setScale(0, 1);
    this.sleepStatusText.setText('밤이 깊어 잠들었습니다 · 5초 남음');
  }

  updateSleeping() {
    this.player.body.setVelocity(0);

    // 이미 수면 완료 후 밝아지는 중이라면
    // 이동 취소 판정을 하지 않음
    if (this.sleepFinishing) {
      return;
    }

    // 23시가 되어 저절로 잠든 경우는 움직여도 취소되지 않음
    if (!this.sleepForced) {
      const moveLeft =
        this.keys.left.isDown ||
        this.cursors.left.isDown;

      const moveRight =
        this.keys.right.isDown ||
        this.cursors.right.isDown;

      const moveUp =
        this.keys.up.isDown ||
        this.cursors.up.isDown;

      const moveDown =
        this.keys.down.isDown ||
        this.cursors.down.isDown;

      const movementPressed =
        moveLeft ||
        moveRight ||
        moveUp ||
        moveDown;

      // 수면 도중 움직이면 취소
      if (movementPressed) {
        this.cancelSleeping();
        return;
      }
    }

    const elapsed =
      this.time.now - this.sleepStartedAt;

    const progress = Phaser.Math.Clamp(
      elapsed / this.sleepDuration,
      0,
      1,
    );

    const remainingMilliseconds =
      this.sleepDuration - elapsed;

    const remainingSeconds = Math.max(
      0,
      Math.ceil(remainingMilliseconds / 1000),
    );

    // 로딩바 진행
    this.sleepProgressFill.setScale(
      progress,
      1,
    );

    this.sleepStatusText.setText(
      this.sleepForced
        ? `밤이 깊어 잠들었습니다 · ${remainingSeconds}초 남음`
        : `${remainingSeconds}초 남음`,
    );

    // 시간이 흐를수록 화면이 점점 어두워짐
    this.sleepDarkOverlay.setAlpha(
      progress * 0.92,
    );

    if (progress >= 1) {
      this.finishSleeping();
    }
  }

  cancelSleeping() {
    if (!this.isSleeping || this.sleepFinishing) {
      return;
    }

    this.isSleeping = false;
    this.sleepFinishing = false;
    this.sleepStartedAt = 0;

    this.sleepUiContainer.setVisible(false);
    this.sleepProgressFill.setScale(0, 1);

    this.tweens.killTweensOf(
      this.sleepDarkOverlay,
    );

    // 어두워졌던 화면을 빠르게 원래대로 복구
    this.tweens.add({
      targets: this.sleepDarkOverlay,
      alpha: 0,
      duration: 250,
      ease: 'Sine.easeOut',

      onComplete: () => {
        this.sleepDarkOverlay.setVisible(false);
      },
    });

    this.interactionMessageActive = true;

    this.interactionText
      .setText('움직여서 잠이 취소되었습니다.')
      .setVisible(true);

    this.time.delayedCall(900, () => {
      this.interactionMessageActive = false;

      if (
        this.currentHouseArea &&
        this.currentHouseArea.name === '침대'
      ) {
        this.interactionText
          .setText(
            '[SPACE] 잠자기 · 5초 동안 움직이지 않기\n꾹 누르면 들어서 옮기기',
          )
          .setVisible(true);

        return;
      }

      this.interactionText.setVisible(false);
    });
  }

  finishSleeping() {
    if (
      !this.isSleeping ||
      this.sleepFinishing
    ) {
      return;
    }

    this.sleepFinishing = true;

    this.sleepProgressFill.setScale(1, 1);
    this.sleepStatusText.setText(
      '잠에서 깨는 중...',
    );

    // 방금 끝난 하루의 번호 (영수증에 표시할 날짜)
    const endedDayNumber = this.dayNumber;

    // 밤 사이 늑대가 다녀갔는지 확인 (자물쇠 없으면 냉장고 밖 떡을 훔쳐감)
    const nightResult = this.resolveNightEvents();

    // 냉장고에 넣지 않은 떡은 다음 날 상함
    const spoiledCount =
      this.spoilUnrefrigeratedRiceCakes();

    // 어제 집세를 내고, 다음 날 집세는 난이도에 따라 인상
    const rentResult = this.applyRentForNewDay();

    // 오늘 하루의 판매 기록으로 영수증 데이터 구성 (기록은 여기서 초기화됨)
    const journalData = this.buildDailyJournal({
      endedDayNumber,
      nightResult,
      rentResult,
      spoiledCount,
    });

    this.dayNumber += 1;

    // 새 하루가 되면 색깔 떡 가격이 -30% ~ +30% 사이에서 무작위로 바뀜
    this.randomizeColoredTteokPrices();

    // 잠을 자면 새로운 하루가 시작되므로 시계를 처음(08:00)으로 되돌림
    this.dayElapsedMs = 0;
    this.dayStartTimestamp = Date.now();
    this.updateDayHUD();
    this.updateInventoryHUD();
    this.updateMoneyHUD();

    // 눈을 뜨는 것처럼 화면을 다시 밝게 함
    this.tweens.add({
      targets: this.sleepDarkOverlay,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',

      onComplete: () => {
        this.isSleeping = false;
        this.sleepFinishing = false;
        this.sleepForced = false;
        this.sleepStartedAt = 0;

        this.sleepDarkOverlay.setVisible(false);
        this.sleepUiContainer.setVisible(false);
        this.sleepProgressFill.setScale(0, 1);

        // 눈을 뜨자마자 어제 하루 요약(영수증)을 보여줌
        this.openJournalPanel(journalData);
      },
    });
  }

  // -------------------------------------------------------------------------
  // 오늘의 판매 기록 (하루일지에 쓰임)
  // -------------------------------------------------------------------------

  recordDailySale(item, quantity, totalPrice) {
    const existing = this.dailyLog.sales[item.type];

    if (existing) {
      existing.count += quantity;
      existing.total += totalPrice;
    } else {
      this.dailyLog.sales[item.type] = {
        name: item.name,
        count: quantity,
        total: totalPrice,
      };
    }
  }

  // 기본 떡을 제외한 색깔 떡들의 가격 변동률을 -30% ~ +30% 사이에서 새로 뽑음
  randomizeColoredTteokPrices() {
    this.shopCategories.tteok.items.forEach((item) => {
      if (item.type === 'ricecake') {
        return;
      }

      item.changePercent = Phaser.Math.Between(-30, 30);
    });

    if (this.shopCategoryKey === 'tteok') {
      this.updateShopPage();
    }
  }

  // -------------------------------------------------------------------------
  // 밤 사이 늑대 습격 처리
  // 녹슨 자물쇠: 늑대가 오든 안 오든 하룻밤만 유효 (소모)
  // 강철 자물쇠: 늑대가 실제로 왔을 때만 소모, 안 오면 계속 유지
  // 자물쇠가 없는데 늑대가 오면 "냉장고 안" 떡을 일정 비율만큼 훔쳐감
  // (냉장고 밖 떡은 어차피 다음 날 상하므로 노리지 않음)
  // -------------------------------------------------------------------------

  getDifficultySettings() {
    return (
      this.difficultySettings[this.difficulty] ||
      this.difficultySettings.easy
    );
  }

  resolveNightEvents() {
    const settings = this.getDifficultySettings();
    const wolfVisited = Math.random() < settings.wolfVisitChance;

    const rustyCount = this.getTotalItemCount('rusty_lock');
    const steelCount = this.getTotalItemCount('steel_lock');
    const isLocked = rustyCount > 0 || steelCount > 0;

    let stolenCount = 0;

    if (wolfVisited) {
      if (rustyCount > 0) {
        this.removeItemFromInventory('rusty_lock', 1);
      } else if (steelCount > 0) {
        this.removeItemFromInventory('steel_lock', 1);
      } else {
        stolenCount = this.stealRiceCakesFromFridge(
          settings.wolfStealPercent,
        );
      }
    } else if (rustyCount > 0) {
      // 늑대가 안 왔어도 녹슨 자물쇠는 하룻밤이 지나면 효력이 사라짐
      this.removeItemFromInventory('rusty_lock', 1);
    }

    return {
      wolfVisited,
      isLocked,
      stolenCount,
    };
  }

  // 냉장고 안에 있는 떡을 percent 비율만큼(최소 1개) 훔쳐감
  stealRiceCakesFromFridge(percent) {
    const total = this.getFridgeTotalCount();

    if (total <= 0) {
      return 0;
    }

    let remainingToSteal = Math.max(
      1,
      Math.round(total * percent),
    );

    remainingToSteal = Math.min(remainingToSteal, total);

    const stolenTotal = remainingToSteal;

    // 냉장고 슬롯을 돌면서 필요한 만큼 순서대로 가져감
    for (
      let i = 0;
      i < this.fridgeData.length && remainingToSteal > 0;
      i += 1
    ) {
      const stack = this.fridgeData[i];

      if (!stack) {
        continue;
      }

      const amount = Math.min(stack.count, remainingToSteal);

      stack.count -= amount;
      remainingToSteal -= amount;

      if (stack.count <= 0) {
        this.fridgeData[i] = null;
      }
    }

    return stolenTotal;
  }

  // -------------------------------------------------------------------------
  // 집세 정산: 어제 집세를 내고, 다음 날 집세는 난이도별 비율로 인상
  // -------------------------------------------------------------------------

  applyRentForNewDay() {
    const moneyBeforeRent = this.money;
    const rentCharged = this.currentRent;
    const moneyAfterRent = moneyBeforeRent - rentCharged;

    // 집세를 내고 나면 보유금이 마이너스가 되는 경우 = 게임 오버
    const isGameOver = moneyAfterRent < 0;

    this.money = Math.max(0, moneyAfterRent);

    const growthRate = this.getDifficultySettings().rentGrowthRate;

    this.currentRent = Math.round(
      this.currentRent * (1 + growthRate),
    );

    return {
      moneyBeforeRent,
      rentCharged,
      moneyAfterRent: this.money,
      nextRent: this.currentRent,
      isGameOver,
    };
  }

  // -------------------------------------------------------------------------
  // 하루일지(영수증) 데이터 구성. 판매 기록은 여기서 다음 날을 위해 초기화됨
  // -------------------------------------------------------------------------

  buildDailyJournal({ endedDayNumber, nightResult, rentResult, spoiledCount }) {
    const sales = Object.values(this.dailyLog.sales);
    const totalEarned = sales.reduce(
      (total, sale) => total + sale.total,
      0,
    );

    // 다음 날을 위해 오늘 판매 기록 초기화
    this.dailyLog = {
      sales: {},
    };

    return {
      endedDayNumber,
      sales,
      totalEarned,
      moneyBeforeRent: rentResult.moneyBeforeRent,
      rentCharged: rentResult.rentCharged,
      moneyAfterRent: rentResult.moneyAfterRent,
      nextRent: rentResult.nextRent,
      isGameOver: rentResult.isGameOver,
      wolfVisited: nightResult.wolfVisited,
      isLocked: nightResult.isLocked,
      stolenCount: nightResult.stolenCount,
      spoiledCount,
    };
  }

  // 냉장고에 보관하지 않은 떡을 전부 "상한 떡"으로 바꿈. 상한 떡은 상점에서 팔 수 없고 버리는 것만 가능
  spoilUnrefrigeratedRiceCakes() {
    let spoiledCount = 0;

    this.inventoryData = this.inventoryData.map((stack) => {
      if (!stack || !this.riceCakeTypes.includes(stack.type)) {
        return stack;
      }

      spoiledCount += stack.count;

      return {
        type: `spoiled_${stack.type}`,
        count: stack.count,
      };
    });

    return spoiledCount;
  }

  // -------------------------------------------------------------------------
  // 냉장고 데이터 (인벤토리와 같은 슬롯 배열, 레벨에 따라 최대 보관 총량 증가)
  // -------------------------------------------------------------------------

  getFridgeCapacity() {
    return this.fridgeCapacityByLevel[this.fridgeLevel] || 10;
  }

  getFridgeTotalCount() {
    return this.fridgeData.reduce(
      (total, stack) => total + (stack ? stack.count : 0),
      0,
    );
  }

  getSlotDataArray(dataSource) {
    return dataSource === 'fridge' ? this.fridgeData : this.inventoryData;
  }

  showHouseAreaMessage(area) {
    this.interactionMessageActive = true;

    this.interactionText.setText(
      `${area.name}: ${area.description}\n현재는 개발 중입니다.`,
    );

    this.time.delayedCall(1500, () => {
      this.interactionMessageActive = false;

      if (!this.currentHouseArea) {
        return;
      }

      this.interactionText.setText(
        `[SPACE] ${this.currentHouseArea.name} 이용하기`,
      );
    });
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