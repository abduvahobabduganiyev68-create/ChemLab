export const categoryNames = {
  alkali: 'Ishqoriy metall',
  alkaline: 'Ishqoriy tuproqli',
  transition: 'O‘tish metali',
  postTransition: 'Past o‘tish metali',
  metalloid: 'Metalloid',
  nonmetal: 'Nometall',
  halogen: 'Galogen',
  noble: 'Inert gaz',
  lanthanide: 'Lantanoid',
  actinide: 'Aktinoid',
  unknown: 'Noma’lum',
}

const rows = [
  [1,'H','Vodorod','nonmetal',1.008,1,1],[2,'He','Geliy','noble',4.0026,18,1],
  [3,'Li','Litiy','alkali',6.94,1,2],[4,'Be','Berilliy','alkaline',9.0122,2,2],[5,'B','Bor','metalloid',10.81,13,2],[6,'C','Uglerod','nonmetal',12.011,14,2],[7,'N','Azot','nonmetal',14.007,15,2],[8,'O','Kislorod','nonmetal',15.999,16,2],[9,'F','Flor','halogen',18.998,17,2],[10,'Ne','Neon','noble',20.180,18,2],
  [11,'Na','Natriy','alkali',22.990,1,3],[12,'Mg','Magniy','alkaline',24.305,2,3],[13,'Al','Aluminiy','postTransition',26.982,13,3],[14,'Si','Kremniy','metalloid',28.085,14,3],[15,'P','Fosfor','nonmetal',30.974,15,3],[16,'S','Oltingugurt','nonmetal',32.06,16,3],[17,'Cl','Xlor','halogen',35.45,17,3],[18,'Ar','Argon','noble',39.948,18,3],
  [19,'K','Kaliy','alkali',39.098,1,4],[20,'Ca','Kalsiy','alkaline',40.078,2,4],[21,'Sc','Skandiy','transition',44.956,3,4],[22,'Ti','Titan','transition',47.867,4,4],[23,'V','Vanadiy','transition',50.942,5,4],[24,'Cr','Xrom','transition',51.996,6,4],[25,'Mn','Marganets','transition',54.938,7,4],[26,'Fe','Temir','transition',55.845,8,4],[27,'Co','Kobalt','transition',58.933,9,4],[28,'Ni','Nikel','transition',58.693,10,4],[29,'Cu','Mis','transition',63.546,11,4],[30,'Zn','Rux','transition',65.38,12,4],[31,'Ga','Galliy','postTransition',69.723,13,4],[32,'Ge','Germaniy','metalloid',72.630,14,4],[33,'As','Mishyak','metalloid',74.922,15,4],[34,'Se','Selen','nonmetal',78.971,16,4],[35,'Br','Brom','halogen',79.904,17,4],[36,'Kr','Kripton','noble',83.798,18,4],
  [37,'Rb','Rubidiy','alkali',85.468,1,5],[38,'Sr','Stronsiy','alkaline',87.62,2,5],[39,'Y','Ittriy','transition',88.906,3,5],[40,'Zr','Tsirkoniy','transition',91.224,4,5],[41,'Nb','Niobiy','transition',92.906,5,5],[42,'Mo','Molibden','transition',95.95,6,5],[43,'Tc','Texnetsiy','transition',98,7,5],[44,'Ru','Ruteniy','transition',101.07,8,5],[45,'Rh','Rodiy','transition',102.91,9,5],[46,'Pd','Palladiy','transition',106.42,10,5],[47,'Ag','Kumush','transition',107.87,11,5],[48,'Cd','Kadmiy','transition',112.41,12,5],[49,'In','Indiy','postTransition',114.82,13,5],[50,'Sn','Qalay','postTransition',118.71,14,5],[51,'Sb','Surma','metalloid',121.76,15,5],[52,'Te','Tellur','metalloid',127.60,16,5],[53,'I','Yod','halogen',126.90,17,5],[54,'Xe','Ksenon','noble',131.29,18,5],
  [55,'Cs','Seziy','alkali',132.91,1,6],[56,'Ba','Bariy','alkaline',137.33,2,6],[57,'La','Lantan','lanthanide',138.91,3,6],[72,'Hf','Gafniy','transition',178.49,4,6],[73,'Ta','Tantal','transition',180.95,5,6],[74,'W','Volfram','transition',183.84,6,6],[75,'Re','Reniy','transition',186.21,7,6],[76,'Os','Osmiyn','transition',190.23,8,6],[77,'Ir','Iridiy','transition',192.22,9,6],[78,'Pt','Platina','transition',195.08,10,6],[79,'Au','Oltin','transition',196.97,11,6],[80,'Hg','Simob','transition',200.59,12,6],[81,'Tl','Talliy','postTransition',204.38,13,6],[82,'Pb','Qo‘rg‘oshin','postTransition',207.2,14,6],[83,'Bi','Vismut','postTransition',208.98,15,6],[84,'Po','Poloniy','postTransition',209,16,6],[85,'At','Astatin','halogen',210,17,6],[86,'Rn','Radon','noble',222,18,6],
  [87,'Fr','Fransiy','alkali',223,1,7],[88,'Ra','Radiy','alkaline',226,2,7],[89,'Ac','Aktiniy','actinide',227,3,7],[104,'Rf','Rezerfordiy','transition',267,4,7],[105,'Db','Dubniy','transition',268,5,7],[106,'Sg','Seaborgiy','transition',269,6,7],[107,'Bh','Boriy','transition',270,7,7],[108,'Hs','Hassiy','transition',277,8,7],[109,'Mt','Maytneriy','unknown',278,9,7],[110,'Ds','Darmshtatiy','unknown',281,10,7],[111,'Rg','Rentgeniy','unknown',282,11,7],[112,'Cn','Kopernitsiy','transition',285,12,7],[113,'Nh','Nihoniy','unknown',286,13,7],[114,'Fl','Fleroviy','postTransition',289,14,7],[115,'Mc','Moskoviy','unknown',290,15,7],[116,'Lv','Livermoriy','unknown',293,16,7],[117,'Ts','Tennessin','unknown',294,17,7],[118,'Og','Oganesson','noble',294,18,7],
]

const lanthanides = [
  [58,'Ce','Seriy',140.12],[59,'Pr','Prazeodim',140.91],[60,'Nd','Neodim',144.24],[61,'Pm','Prometiy',145],[62,'Sm','Samariy',150.36],[63,'Eu','Evropiy',151.96],[64,'Gd','Gadoliniy',157.25],[65,'Tb','Terbiy',158.93],[66,'Dy','Disprosiy',162.50],[67,'Ho','Golmiy',164.93],[68,'Er','Erbiy',167.26],[69,'Tm','Tuliym',168.93],[70,'Yb','Iterbiy',173.05],[71,'Lu','Lyutesiy',174.97],
]
const actinides = [
  [90,'Th','Toriy',232.04],[91,'Pa','Protaktiniy',231.04],[92,'U','Uran',238.03],[93,'Np','Neptuniy',237],[94,'Pu','Plutoniy',244],[95,'Am','Ameritsiy',243],[96,'Cm','Kyuriy',247],[97,'Bk','Berkliy',247],[98,'Cf','Kaliforniy',251],[99,'Es','Eyshteyniy',252],[100,'Fm','Fermiy',257],[101,'Md','Mendeleviy',258],[102,'No','Nobeliy',259],[103,'Lr','Lavrensiy',266],
]

lanthanides.forEach((r,i) => rows.push([r[0],r[1],r[2],'lanthanide',r[3],i+3,9]))
actinides.forEach((r,i) => rows.push([r[0],r[1],r[2],'actinide',r[3],i+3,10]))

export const elements = rows.map(([number,symbol,name,category,mass,group,period]) => ({
  number, symbol, name, uzName: name, category, mass, group, period,
  electronConfiguration: number <= 18 ? 'Davr ma’lumotlari mavjud emas' : 'Davr ma’lumotlari mavjud emas',
}))
