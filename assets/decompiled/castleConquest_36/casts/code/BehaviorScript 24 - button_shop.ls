property my, itemName, itemPrice, itemWorldName, active
global objGame

on beginSprite me
  my = sprite(me.spriteNum)
  me.activate()
end

on mouseEnter me
  if active then
    my.blend = 100
    sprite(me.spriteNum).cursor = 280
  else
    sprite(me.spriteNum).cursor = -1
  end if
  objGame.displayShopItem(itemName, itemPrice)
end

on mouseUp me
  if active then
    objGame.buyShopItem(itemName, itemPrice, itemWorldName)
  end if
end

on mouseLeave me
  if active then
    my.blend = 0
    sprite(me.spriteNum).cursor = -1
  end if
  objGame.unDisplayShopItem()
end

on deactivate me
  active = 0
  my.member = member("shop_button_deactivated")
  my.blend = 50
end

on activate me
  active = 1
  my.member = member("shop_button")
  my.blend = 0
end

on getPrice me
  return itemPrice
end

on getPropertyDescriptionList
  description = [:]
  addProp(description, #itemName, [#default: EMPTY, #format: #string, #comment: "Item Name"])
  addProp(description, #itemPrice, [#default: EMPTY, #format: #integer, #comment: "Item Price"])
  addProp(description, #itemWorldName, [#default: EMPTY, #format: #string, #comment: "3D World Name"])
  return description
end
